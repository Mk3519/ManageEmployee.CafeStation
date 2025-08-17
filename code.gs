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
      
      default:
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Invalid action'
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

    const employees = data.slice(1)
      .filter(row => {
        console.log('Checking row:', row);
        console.log('Branch in row:', row[4]);
        return row[4] === branch;
      })
      .map(row => ({
        code: row[0],
        name: row[1],
        title: row[2],
        phone: row[3],    // إضافة رقم الهاتف
        branch: row[4]    // إضافة اسم الفرع
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
    console.log('Branch:', branch);
    
    if (!branch) {
      console.log('No branch specified in request');
      throw new Error('لم يتم تحديد الفرع');
    }

    const ss = SpreadsheetApp.getActive();
    const employeesSheet = ss.getSheetByName('Employees');
    const evaluationsSheet = ss.getSheetByName('Evaluations');
    const attendanceSheet = ss.getSheetByName('Attendance');
    const penaltiesSheet = ss.getSheetByName('Penalties');
    
    // الحصول على بيانات الشهر الحالي
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // جلب البيانات
    const employees = employeesSheet.getDataRange().getValues();
    const evaluations = evaluationsSheet.getDataRange().getValues();
    const attendance = attendanceSheet.getDataRange().getValues();
    const penalties = penaltiesSheet.getDataRange().getValues();
    
    let bestEmployee = null;
    let highestScore = 0;
    
    // حساب عدد أيام العمل في الشهر (باستثناء الجمعة)
    const workDaysInMonth = getWorkDaysInMonth(firstDayOfMonth, lastDayOfMonth);
    
    // معالجة كل موظف في الفرع المحدد
    console.log('All employees:', employees.slice(1));
    const branchEmployees = employees.slice(1).filter(employee => employee[4] === branch);
    console.log('Branch employees:', branchEmployees);
    
    branchEmployees.forEach(employee => {
        const employeeCode = employee[0];
        console.log('Processing employee:', employee);
        
        // حساب نسبة الحضور
        const attendanceRate = calculateAttendanceRate(
          attendance.slice(1),
          employeeCode,
          firstDayOfMonth,
          workDaysInMonth
        );
        
        // حساب متوسط التقييمات
        const evaluationRate = calculateEvaluationRate(
          evaluations.slice(1),
          employeeCode,
          firstDayOfMonth
        );
        
        // التحقق من وجود جزاءات
        const penaltyInfo = checkPenalties(
          penalties.slice(1),
          employeeCode,
          firstDayOfMonth
        );
        
        // حساب التقييم النهائي
        // 40% للحضور + 60% للتقييم - خصم الجزاءات
        const finalScore = calculateFinalScore(attendanceRate, evaluationRate, penaltyInfo.deduction);
        
        if (finalScore > highestScore) {
          highestScore = finalScore;
          bestEmployee = {
            name: employee[1],
            branch: employee[4],
            title: employee[2],
            attendanceRate: attendanceRate,
            evaluationRate: evaluationRate,
            hasPenalty: penaltyInfo.hasPenalty,
            finalScore: finalScore
          };
        }
    });
    
    const response = {
      success: true,
      employee: bestEmployee,
      debug: {
        employeesCount: employees.length - 1,
        branchEmployeesCount: employees.slice(1).filter(emp => emp[4] === branch).length,
        evaluationsCount: evaluations.length - 1,
        attendanceCount: attendance.length - 1,
        penaltiesCount: penalties.length - 1
      }
    };
    
    console.log('Final response:', response);
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error in getBestEmployee:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// دالة لحساب أيام العمل في الشهر (باستثناء الجمعة)
function getWorkDaysInMonth(startDate, endDate) {
  let workDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    if (currentDate.getDay() !== 5) { // 5 يمثل يوم الجمعة
      workDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workDays;
}

// دالة لحساب نسبة الحضور
function calculateAttendanceRate(attendanceData, employeeCode, startDate, workDays) {
  const presentDays = attendanceData.filter(row => {
    const date = new Date(row[0]);
    return date >= startDate && 
           row[1] === employeeCode && 
           row[2] === 'Present';
  }).length;
  
  return (presentDays / workDays) * 100;
}

// دالة لحساب متوسط التقييمات
function calculateEvaluationRate(evaluationsData, employeeCode, startDate) {
  const monthEvaluations = evaluationsData.filter(row => {
    const date = new Date(row[0]);
    return date >= startDate && row[1] === employeeCode;
  });
  
  if (monthEvaluations.length === 0) {
    return 0;
  }
  
  const averageRating = monthEvaluations.reduce((acc, row) => {
    // حساب متوسط التقييمات (النظافة، المظهر، العمل الجماعي، الالتزام بالمواعيد)
    return acc + ((row[2] + row[3] + row[4] + row[5]) / 4);
  }, 0) / monthEvaluations.length;
  
  return (averageRating / 5) * 100; // تحويل التقييم إلى نسبة مئوية
}

// دالة للتحقق من الجزاءات
function checkPenalties(penaltiesData, employeeCode, startDate) {
  const monthPenalties = penaltiesData.filter(row => {
    const date = new Date(row[0]);
    return date >= startDate && row[1] === employeeCode;
  });
  
  return {
    hasPenalty: monthPenalties.length > 0,
    deduction: monthPenalties.length > 0 ? 10 : 0 // خصم 10% في حالة وجود جزاءات
  };
}

// دالة لحساب التقييم النهائي
function calculateFinalScore(attendanceRate, evaluationRate, penaltyDeduction) {
  return Math.max(0, (attendanceRate * 0.4) + (evaluationRate * 0.6) - penaltyDeduction);
}

function getEmployeeReport(e) {
  try {
    console.log('Getting report for employee:', e.parameter.employeeId);
    console.log('Report type:', e.parameter.reportType);
    
    const employeeId = e.parameter.employeeId;
    const reportType = e.parameter.reportType;
    const ss = SpreadsheetApp.getActive();
    
    switch(reportType) {
      case 'attendance':
        const attendanceSheet = ss.getSheetByName('Attendance');
        const allData = attendanceSheet.getDataRange().getValues();
        console.log('Total attendance records:', allData.length);
        
        // التحقق من وجود بيانات
        if (allData.length <= 1) {
          throw new Error('لا توجد سجلات حضور');
        }

        // استخراج سجلات الحضور للموظف المحدد
        const employeeAttendance = allData.slice(1)  // تخطي صف العناوين
          .filter(row => {
            console.log('Checking row:', row, 'Employee ID:', row[1], 'Looking for:', employeeId);
            return row[1].toString() === employeeId.toString();
          })
          .map(row => ({
            date: formatDate(row[0]),
            status: row[2]
          }));

        console.log('Found attendance records:', employeeAttendance.length);
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: employeeAttendance,
          debug: {
            totalRecords: allData.length,
            employeeId: employeeId,
            foundRecords: employeeAttendance.length
          }
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'evaluation':
        const evaluationsSheet = ss.getSheetByName('Evaluations');
        const allEvalData = evaluationsSheet.getDataRange().getValues();
        console.log('Total evaluation records:', allEvalData.length);
        
        // التحقق من وجود بيانات
        if (allEvalData.length <= 1) {
          throw new Error('لا توجد سجلات تقييم');
        }

        // استخراج سجلات التقييم للموظف المحدد
        const employeeEvaluations = allEvalData.slice(1)  // تخطي صف العناوين
          .filter(row => {
            console.log('Checking evaluation row:', row, 'Employee ID:', row[1], 'Looking for:', employeeId);
            return row[1].toString() === employeeId.toString();
          })
          .map(row => ({
            date: formatDate(row[0]),
            cleanliness: Number(row[2]),
            appearance: Number(row[3]),
            teamwork: Number(row[4]),
            punctuality: Number(row[5]),
            average: Number(row[6])
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date)); // ترتيب حسب التاريخ تنازلياً

        console.log('Found evaluation records:', employeeEvaluations.length);
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: employeeEvaluations,
          debug: {
            totalRecords: allEvalData.length,
            employeeId: employeeId,
            foundRecords: employeeEvaluations.length
          }
        })).setMimeType(ContentService.MimeType.JSON);
        
      case 'penalty':
        const penaltiesSheet = ss.getSheetByName('Penalties');
        const allPenaltyData = penaltiesSheet.getDataRange().getValues();
        console.log('Total penalty records:', allPenaltyData.length);
        
        // التحقق من وجود بيانات
        if (allPenaltyData.length <= 1) {
          throw new Error('لا توجد سجلات جزاءات');
        }

        // استخراج سجلات الجزاءات للموظف المحدد
        const employeePenalties = allPenaltyData.slice(1)  // تخطي صف العناوين
          .filter(row => {
            console.log('Checking penalty row:', row, 'Employee ID:', row[1], 'Looking for:', employeeId);
            return row[1].toString() === employeeId.toString();
          })
          .map(row => ({
            date: formatDate(row[0]),
            reason: row[2],
            amount: row[3]
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date)); // ترتيب حسب التاريخ تنازلياً

        console.log('Found penalty records:', employeePenalties.length);
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          data: employeePenalties,
          debug: {
            totalRecords: allPenaltyData.length,
            employeeId: employeeId,
            foundRecords: employeePenalties.length
          }
        })).setMimeType(ContentService.MimeType.JSON);
        
      default:
        throw new Error('نوع تقرير غير صالح');
    }
  } catch (error) {
    console.error('Error in getEmployeeReport:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      debug: {
        employeeId: e.parameter.employeeId,
        reportType: e.parameter.reportType
      }
    })).setMimeType(ContentService.MimeType.JSON);
  }
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
