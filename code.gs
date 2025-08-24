// Google Apps Script Code

// This function runs when the spreadsheet is opened
function onOpen() {
  initializeSpreadsheet();
}

function doGet(e) {
  const action = e.parameter.action;
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    initializeSpreadsheet(); // Ensure sheets exist before any operation
    
    switch(action) {
      case 'getEmployees':
        return getEmployeesByBranch(e.parameter.branch);
      case 'getBestEmployee':
        return getBestEmployee(e);
      case 'login':
        return handleLogin(e.parameter.email, e.parameter.password);
      case 'getEmployeeReport':
        return getEmployeeReport(e);
      case 'getComprehensiveReport':
        return getComprehensiveReport(e);
      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'عملية غير صالحة'
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
    initializeSpreadsheet(); // Ensure sheets exist before any operation

    console.log('Received POST request:', JSON.stringify(e));
    
    // تحويل البيانات المستلمة إلى كائن JavaScript
    let data;
    try {
      const action = e.parameter.action;
      console.log('Received action:', action);
      console.log('Received parameters:', JSON.stringify(e.parameter));
      
      if (!action) {
        throw new Error('No action specified');
      }

      if (e.parameter.data) {
        try {
          // محاولة تحليل البيانات كـ JSON
          data = {
            action: action,
            data: JSON.parse(e.parameter.data)
          };
        } catch (parseError) {
          // إذا فشل التحليل، نستخدم البيانات كما هي
          data = {
            action: action,
            data: e.parameter.data
          };
        }
      } else if (e.postData && e.postData.contents) {
        data = JSON.parse(e.postData.contents);
      } else {
        throw new Error('No data received');
      }
      
      console.log('Final parsed data:', JSON.stringify(data));
    } catch (parseError) {
      console.error('Error parsing data:', parseError, 'Received data:', e.postData ? e.postData.contents : 'No postData');
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid data format',
        debug: e.parameter
      })).setMimeType(ContentService.MimeType.JSON);
    }

    console.log('Received action:', data.action); // للتحقق من نوع العملية
    console.log('Received data:', data.data); // للتحقق من البيانات
    
    switch(data.action) {
      case 'addEmployee':
        return addEmployee(data.data);
      case 'recordAttendance':
        return recordAttendance(data.data);
      case 'submitEvaluation':
        return submitEvaluation(data.data);
      case 'addPenalty':
        return addPenalty(data.data);
      case 'updateEmployee':
        return updateEmployee(data.data);
      case 'deleteEmployee':
        return deleteEmployee(data.data);
      default:
        console.error('Invalid action:', data.action);
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Invalid action',
          receivedAction: data.action
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Initialize Spreadsheet
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActive();
  
  // Create sheets if they don't exist
  if (!ss.getSheetByName('Employees')) {
    const employeesSheet = ss.insertSheet('Employees');
    employeesSheet.getRange('A1:E1').setValues([['Code', 'Name', 'Title', 'Phone', 'Branch']]);
  }
  
  if (!ss.getSheetByName('Attendance')) {
    const attendanceSheet = ss.insertSheet('Attendance');
    attendanceSheet.getRange('A1:C1').setValues([['Date', 'Employee Code', 'Status']]);
  }
  
  if (!ss.getSheetByName('Users')) {
    const usersSheet = ss.insertSheet('Users');
    usersSheet.getRange('A1:C1').setValues([['Email', 'Password', 'Branch']]);
  }
  
  if (!ss.getSheetByName('Evaluations')) {
    const evaluationsSheet = ss.insertSheet('Evaluations');
    evaluationsSheet.getRange('A1:G1').setValues([
      ['Date', 'Employee Code', 'Cleanliness', 'Appearance', 'Teamwork', 'Punctuality', 'Average']
    ]);
  }
  
  if (!ss.getSheetByName('Penalties')) {
    const penaltiesSheet = ss.insertSheet('Penalties');
    penaltiesSheet.getRange('A1:D1').setValues([['Date', 'Employee Code', 'Reason', 'Amount']]);
  }
}

// Helper Functions
function getEmployeesByBranch(branch) {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName('Employees');
    if (!sheet) {
      throw new Error('لم يتم العثور على ورقة الموظفين');
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        employees: [],
        message: 'لا يوجد موظفين مسجلين بعد'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    console.log('Branch received:', branch);
    console.log('Total rows:', data.length);

    // إذا كان الاختيار "All Branches" نعيد جميع الموظفين
    const employees = data.slice(1)
      .filter(row => {
        console.log('Checking row:', row);
        console.log('Branch in row:', row[4]);
        return branch === 'All Branches' ? true : row[4] === branch;
      })
      .map(row => ({
        code: row[0],
        name: row[1],
        title: row[2],
        phone: row[3],
        branch: row[4]
      }));
    
    console.log('Filtered employees:', employees);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      employees: employees
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error in getEmployeesByBranch:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: 'حدث خطأ أثناء جلب بيانات الموظفين'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function addEmployee(employeeData) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Employees');
  sheet.appendRow([
    employeeData.code,
    employeeData.name,
    employeeData.title,
    employeeData.phone,
    employeeData.branch
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function updateEmployee(employeeData) {
  console.log('Received update request with data:', employeeData);
  
  try {
    // التحقق من البيانات المستلمة
    if (typeof employeeData === 'string') {
      employeeData = JSON.parse(employeeData);
    }
    
    console.log('Parsed employee data:', employeeData);
    
    const sheet = SpreadsheetApp.getActive().getSheetByName('Employees');
    if (!sheet) {
      throw new Error('لم يتم العثور على ورقة الموظفين');
    }

    const data = sheet.getDataRange().getValues();
    
    // البحث عن الموظف بالكود
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === employeeData.code) {
        console.log('Found employee at row:', i + 1);
        
        // تحديث بيانات الموظف
        sheet.getRange(i + 1, 1, 1, 5).setValues([[
          employeeData.code,
          employeeData.name,
          employeeData.title,
          employeeData.phone,
          employeeData.branch
        ]]);
        
        SpreadsheetApp.flush(); // التأكد من حفظ التغييرات
        console.log('Employee data updated successfully');
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: 'تم تحديث بيانات الموظف بنجاح'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    console.log('Employee not found with code:', employeeData.code);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'لم يتم العثور على الموظف'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in updateEmployee:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function deleteEmployee(employeeCode) {
  console.log('Attempting to delete employee with code:', employeeCode);
  
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName('Employees');
    const data = sheet.getDataRange().getValues();
    
    // البحث عن الموظف بالكود
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === employeeCode) {
        console.log('Found employee to delete at row:', i + 1);
        sheet.deleteRow(i + 1);
        console.log('Employee deleted successfully');
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: 'تم حذف الموظف بنجاح'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    console.log('Employee not found for deletion');
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'لم يتم العثور على الموظف'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in deleteEmployee:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function recordAttendance(attendanceData) {
  try {
    console.log('Starting recordAttendance with data:', attendanceData);
    
    // تحويل البيانات من نص JSON إلى كائن إذا كانت نصية
    if (typeof attendanceData === 'string') {
      attendanceData = JSON.parse(attendanceData);
    }

    if (!attendanceData || !Array.isArray(attendanceData)) {
      throw new Error('Invalid attendance data format');
    }

    const sheet = SpreadsheetApp.getActive().getSheetByName('Attendance');
    if (!sheet) {
      throw new Error('Attendance sheet not found');
    }

    // التحقق من البيانات قبل الإضافة
    attendanceData.forEach((record, index) => {
      if (!record.date || !record.employeeId || !record.status) {
        throw new Error(`Invalid record at index ${index}: Missing required fields`);
      }
    });
    
    // إضافة سجلات الحضور
    attendanceData.forEach(record => {
      const date = new Date(record.date);
      sheet.appendRow([date, record.employeeId, record.status]);
    });
    
    console.log('Successfully recorded attendance for', attendanceData.length, 'employees');
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'تم تسجيل الحضور بنجاح'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error in recordAttendance:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: 'حدث خطأ في تسجيل الحضور'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function submitEvaluation(evaluationData) {
  try {
    console.log('Starting submitEvaluation with data:', JSON.stringify(evaluationData));
    
    // تحويل البيانات من نص JSON إلى كائن إذا كانت نصية
    if (typeof evaluationData === 'string') {
      evaluationData = JSON.parse(evaluationData);
    }

    const sheet = SpreadsheetApp.getActive().getSheetByName('Evaluations');
    if (!sheet) {
      throw new Error('لم يتم العثور على ورقة التقييمات');
    }

    // التحقق من صحة البيانات
    function validateEvaluation(evaluation) {
      if (!evaluation.date || !evaluation.employeeId ||
          !evaluation.cleanliness || !evaluation.appearance ||
          !evaluation.teamwork || !evaluation.punctuality) {
        throw new Error('بيانات التقييم غير مكتملة');
      }
      
      // التأكد من أن القيم رقمية وضمن النطاق المقبول (1-5)
      const ratings = [
        Number(evaluation.cleanliness),
        Number(evaluation.appearance),
        Number(evaluation.teamwork),
        Number(evaluation.punctuality)
      ];
      
      ratings.forEach(rating => {
        if (isNaN(rating) || rating < 1 || rating > 5) {
          throw new Error('قيم التقييم يجب أن تكون بين 1 و 5');
        }
      });
      
      return ratings;
    }

    // معالجة التقييمات
    function processEvaluation(evaluation) {
      const ratings = validateEvaluation(evaluation);
      const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      
      sheet.appendRow([
        new Date(evaluation.date),
        evaluation.employeeId,
        ratings[0], // cleanliness
        ratings[1], // appearance
        ratings[2], // teamwork
        ratings[3], // punctuality
        average
      ]);
      
      return average;
    }

    let results = [];
    if (Array.isArray(evaluationData)) {
      // معالجة مصفوفة من التقييمات
      evaluationData.forEach((evaluation, index) => {
        try {
          const average = processEvaluation(evaluation);
          results.push({
            employeeId: evaluation.employeeId,
            success: true,
            average: average
          });
        } catch (err) {
          results.push({
            employeeId: evaluation.employeeId,
            success: false,
            error: err.message
          });
        }
      });
    } else {
      // معالجة تقييم واحد
      const average = processEvaluation(evaluationData);
      results.push({
        employeeId: evaluationData.employeeId,
        success: true,
        average: average
      });
    }

    console.log('Evaluation results:', results);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      results: results,
      message: 'تم حفظ التقييم بنجاح'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in submitEvaluation:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: 'حدث خطأ في حفظ التقييم'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function addPenalty(penaltyData) {
  try {
    console.log('Received penalty data:', JSON.stringify(penaltyData));
    
    if (typeof penaltyData === 'string') {
      penaltyData = JSON.parse(penaltyData);
    }

    const sheet = SpreadsheetApp.getActive().getSheetByName('Penalties');
    if (!sheet) {
      throw new Error('Penalties sheet not found');
    }

    // Validate required fields
    if (!penaltyData.employeeId || !penaltyData.reason || !penaltyData.deductionPeriod) {
      throw new Error('Missing required penalty data');
    }

    sheet.appendRow([
      new Date(penaltyData.date),
      penaltyData.employeeId,
      penaltyData.reason,
      penaltyData.deductionPeriod
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'تم إضافة الجزاء بنجاح'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in addPenalty:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: 'حدث خطأ في إضافة الجزاء'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleLogin(email, password) {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName('Users');
    const data = sheet.getDataRange().getValues();
    
    // Skip header row and search for user
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === email && data[i][1] === password) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          branch: data[i][2]
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'بيانات الدخول غير صحيحة'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'حدث خطأ في تسجيل الدخول'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getBestEmployee(e) {
  try {
    console.log('getBestEmployee called with:', e);
    const branch = e?.parameter?.branch;
    if (!branch) {
      throw new Error('لم يتم تحديد الفرع');
    }

    const ss = SpreadsheetApp.getActive();
    const employeesSheet = ss.getSheetByName('Employees');
    const evaluationsSheet = ss.getSheetByName('Evaluations');
    const attendanceSheet = ss.getSheetByName('Attendance');
    const penaltiesSheet = ss.getSheetByName('Penalties');
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const employees = employeesSheet.getDataRange().getValues();
    const branchEmployees = employees.slice(1).filter(emp => emp[4] === branch);

    let employeeScores = [];

    // معالجة كل موظف
    for (const employee of branchEmployees) {
      const employeeId = employee[0];
      
      // حساب نسبة الحضور (50%)
      const attendanceRecords = attendanceSheet.getDataRange().getValues()
        .slice(1)
        .filter(row => {
          const date = new Date(row[0]);
          return date >= firstDayOfMonth && 
                 date <= lastDayOfMonth && 
                 row[1] === employeeId &&
                 row[2] === 'Present';
        });
      
      const attendanceScore = (attendanceRecords.length / 26) * 50;

      // حساب متوسط التقييمات (50%)
      const evaluations = evaluationsSheet.getDataRange().getValues()
        .slice(1)
        .filter(row => {
          const date = new Date(row[0]);
          return date >= firstDayOfMonth && 
                 date <= lastDayOfMonth && 
                 row[1] === employeeId;
        });

      let evaluationScore = 0;
      if (evaluations.length > 0) {
        const avgRating = evaluations.reduce((sum, row) => {
          return sum + ((row[2] + row[3] + row[4] + row[5]) / 4);
        }, 0) / evaluations.length;
        evaluationScore = (avgRating / 5) * 50;
      }

      // حساب خصومات الجزاءات
      const penalties = penaltiesSheet.getDataRange().getValues()
        .slice(1)
        .filter(row => {
          const date = new Date(row[0]);
          return date >= firstDayOfMonth && 
                 date <= lastDayOfMonth && 
                 row[1] === employeeId;
        });

      let penaltyDeduction = 0;
      if (penalties.length > 0) {
        penalties.forEach(penalty => {
          switch(penalty[3]) {
            case 'ربع يوم': penaltyDeduction += 5; break;
            case 'نصف يوم': penaltyDeduction += 10; break;
            case 'يوم': penaltyDeduction += 15; break;
            case 'يومين': penaltyDeduction += 20; break;
            case 'ثلاثة أيام': penaltyDeduction += 25; break;
          }
        });
      }

      const finalScore = Math.max(0, attendanceScore + evaluationScore - penaltyDeduction);

      employeeScores.push({
        name: employee[1],
        branch: employee[4],
        title: employee[2],
        attendanceRate: attendanceScore,
        evaluationRate: evaluationScore,
        penaltyDeduction: penaltyDeduction,
        hasPenalty: penalties.length > 0,
        finalScore: finalScore
      });
    }

    // ترتيب الموظفين حسب النتيجة النهائية
    employeeScores.sort((a, b) => b.finalScore - a.finalScore);

    // أخذ أفضل 4 موظفين
    const topEmployees = employeeScores.slice(0, 4);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      employees: topEmployees
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in getBestEmployee:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getEmployeeReport(e) {
  try {
    console.log('Getting report for employee:', e.parameter.employeeId);
    console.log('Report type:', e.parameter.reportType);
    console.log('Selected month:', e.parameter.month);
    
    const employeeId = e.parameter.employeeId;
    const reportType = e.parameter.reportType;
    const selectedMonth = e.parameter.month;
    
    if (!employeeId || !reportType || !selectedMonth) {
      throw new Error('Missing required parameters');
    }

    const selectedDate = new Date(selectedMonth);
    const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    const ss = SpreadsheetApp.getActive();
    
    switch(reportType) {
      case 'attendance':
        const attendanceSheet = ss.getSheetByName('Attendance');
        const allData = attendanceSheet.getDataRange().getValues();
        
        const employeeAttendance = allData.slice(1)
          .filter(row => {
            const recordDate = new Date(row[0]);
            return row[1].toString() === employeeId.toString() &&
                   recordDate >= firstDayOfMonth &&
                   recordDate <= lastDayOfMonth;
          })
          .map(row => ({
            date: formatDate(row[0]),
            status: row[2]
          }));

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: employeeAttendance
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'evaluation':
        const evaluationsSheet = ss.getSheetByName('Evaluations');
        const allEvalData = evaluationsSheet.getDataRange().getValues();
        
        const employeeEvaluations = allEvalData.slice(1)
          .filter(row => {
            const recordDate = new Date(row[0]);
            return row[1].toString() === employeeId.toString() &&
                   recordDate >= firstDayOfMonth &&
                   recordDate <= lastDayOfMonth;
          })
          .map(row => ({
            date: formatDate(row[0]),
            cleanliness: Number(row[2]),
            appearance: Number(row[3]),
            teamwork: Number(row[4]),
            punctuality: Number(row[5]),
            average: Number(row[6])
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: employeeEvaluations
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'penalty':
        const penaltiesSheet = ss.getSheetByName('Penalties');
        const allPenaltyData = penaltiesSheet.getDataRange().getValues();
        
        const employeePenalties = allPenaltyData.slice(1)
          .filter(row => {
            const recordDate = new Date(row[0]);
            return row[1].toString() === employeeId.toString() &&
                   recordDate >= firstDayOfMonth &&
                   recordDate <= lastDayOfMonth;
          })
          .map(row => ({
            date: formatDate(row[0]),
            reason: row[2],
            amount: row[3]
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: employeePenalties
        })).setMimeType(ContentService.MimeType.JSON);
        
      default:
        throw new Error('Invalid report type');
    }
  } catch (error) {
    console.error('Error in getEmployeeReport:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// دالة الحصول على التقرير الشامل
function getComprehensiveReport(e) {
  try {
    const period = e.parameter.period;
    const startDate = e.parameter.startDate;
    const branch = e.parameter.branch;
    
    if (!period || !startDate || !branch) {
      throw new Error('يرجى توفير جميع المعلومات المطلوبة');
    }

    const ss = SpreadsheetApp.getActive();
    const employeesSheet = ss.getSheetByName('Employees');
    const attendanceSheet = ss.getSheetByName('Attendance');
    const evaluationsSheet = ss.getSheetByName('Evaluations');
    const penaltiesSheet = ss.getSheetByName('Penalties');

    // تحديد نطاق التاريخ
    const dateRange = getDateRange(startDate, period);
    const startDateTime = dateRange.start;
    const endDateTime = dateRange.end;

    // الحصول على بيانات الموظفين في الفرع
    const employees = employeesSheet.getDataRange().getValues();
    const branchEmployees = employees.slice(1).filter(emp => emp[4] === branch);

    // تجميع البيانات لكل موظف
    const employeesData = branchEmployees.map(employee => {
      const employeeCode = employee[0];
      
      // بيانات الحضور
      const attendance = getAttendanceData(attendanceSheet, employeeCode, startDateTime, endDateTime);
      
      // بيانات التقييم
      const evaluations = getEvaluationData(evaluationsSheet, employeeCode, startDateTime, endDateTime);
      
      // بيانات الجزاءات
      const penalties = getPenaltyData(penaltiesSheet, employeeCode, startDateTime, endDateTime);

      return {
        code: employeeCode,
        name: employee[1],
        title: employee[2],
        attendance: attendance,
        evaluations: evaluations,
        penalties: penalties
      };
    });

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      employees: employeesData,
      dateRange: {
        start: formatDate(startDateTime),
        end: formatDate(endDateTime)
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error in getComprehensiveReport:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// دالة تحديد نطاق التاريخ حسب نوع التقرير
function getDateRange(startDate, period) {
  const start = new Date(startDate);
  let end = new Date(start);
  
  switch (period) {
    case 'daily':
      end.setDate(start.getDate() + 1);
      break;
    case 'weekly':
      end.setDate(start.getDate() + 7);
      break;
    case 'monthly':
      end.setMonth(start.getMonth() + 1);
      break;
    default:
      throw new Error('نوع تقرير غير صالح');
  }
  
  return { start, end };
}

// دالة الحصول على بيانات الحضور
function getAttendanceData(sheet, employeeCode, startDate, endDate) {
  const data = sheet.getDataRange().getValues();
  const records = data.slice(1).filter(row => {
    const recordDate = new Date(row[0]);
    return row[1] === employeeCode && 
           recordDate >= startDate && 
           recordDate < endDate;
  });
  
  if (records.length === 0) {
    return {
      present: 0,
      absent: 0,
      vacation: 0
    };
  }
  
  // حساب إحصائيات الحضور
  const stats = records.reduce((acc, row) => {
    const status = row[2];
    if (status === 'Present') acc.present++;
    else if (status === 'Absent') acc.absent++;
    else if (status === 'vacation' || status === 'Leave a vacation') acc.vacation++;
    return acc;
  }, { present: 0, absent: 0, vacation: 0 });
  
  return stats;
}

// دالة الحصول على بيانات التقييم
function getEvaluationData(sheet, employeeCode, startDate, endDate) {
  const data = sheet.getDataRange().getValues();
  const records = data.slice(1).filter(row => {
    const recordDate = new Date(row[0]);
    return row[1] === employeeCode && 
           recordDate >= startDate && 
           recordDate < endDate;
  });

  if (records.length === 0) {
    return {
      cleanliness: 0,
      appearance: 0,
      teamwork: 0,
      punctuality: 0
    };
  }

  // حساب متوسط التقييمات
  const totals = records.reduce((acc, row) => {
    acc.cleanliness += Number(row[2]);
    acc.appearance += Number(row[3]);
    acc.teamwork += Number(row[4]);
    acc.punctuality += Number(row[5]);
    return acc;
  }, { cleanliness: 0, appearance: 0, teamwork: 0, punctuality: 0 });

  const count = records.length;
  return {
    cleanliness: (totals.cleanliness / count).toFixed(2),
    appearance: (totals.appearance / count).toFixed(2),
    teamwork: (totals.teamwork / count).toFixed(2),
    punctuality: (totals.punctuality / count).toFixed(2)
  };
}

// دالة الحصول على بيانات الجزاءات
function getPenaltyData(sheet, employeeCode, startDate, endDate) {
  const data = sheet.getDataRange().getValues();
  const records = data.slice(1).filter(row => {
    const recordDate = new Date(row[0]);
    return row[1] === employeeCode && 
           recordDate >= startDate && 
           recordDate < endDate;
  });

  if (records.length === 0) {
    return {
      count: 0,
      totalDays: 0
    };
  }

  // حساب إجمالي أيام الجزاءات
  const totalDays = records.reduce((total, row) => {
    const amount = row[3];
    switch(amount) {
      case 'ربع يوم': return total + 0.25;
      case 'نصف يوم': return total + 0.5;
      case 'يوم': return total + 1;
      case 'يومين': return total + 2;
      case 'ثلاثة أيام': return total + 3;
      default: return total;
    }
  }, 0);

  return {
    count: records.length,
    totalDays: totalDays
  };
}

// تحسين دالة تنسيق التاريخ
function formatDate(date) {
  try {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    // التأكد من أن التاريخ صالح
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid Date';
  }
}
