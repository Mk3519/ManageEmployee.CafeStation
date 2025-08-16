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
        return getBestEmployee();
      case 'login':
        return handleLogin(e.parameter.email, e.parameter.password);
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
  const sheet = SpreadsheetApp.getActive().getSheetByName('Evaluations');
  
  // التعامل مع مصفوفة من التقييمات
  if (Array.isArray(evaluationData)) {
    evaluationData.forEach(evaluation => {
      const average = (
        Number(evaluation.cleanliness) +
        Number(evaluation.appearance) +
        Number(evaluation.teamwork) +
        Number(evaluation.punctuality)
      ) / 4;
      
      sheet.appendRow([
        new Date(evaluation.date),
        evaluation.employeeId,
        evaluation.cleanliness,
        evaluation.appearance,
        evaluation.teamwork,
        evaluation.punctuality,
        average
      ]);
    });
  } else {
    // التعامل مع تقييم واحد
    const average = (
      Number(evaluationData.cleanliness) +
      Number(evaluationData.appearance) +
      Number(evaluationData.teamwork) +
      Number(evaluationData.punctuality)
    ) / 4;
    
    sheet.appendRow([
      new Date(evaluationData.date),
      evaluationData.employeeId,
      evaluationData.cleanliness,
      evaluationData.appearance,
      evaluationData.teamwork,
      evaluationData.punctuality,
      average
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

function addPenalty(penaltyData) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Penalties');
  sheet.appendRow([
    new Date(penaltyData.date),
    penaltyData.employeeId,
    penaltyData.reason,
    penaltyData.amount
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
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

function getBestEmployee() {
  const ss = SpreadsheetApp.getActive();
  const employeesSheet = ss.getSheetByName('Employees');
  const evaluationsSheet = ss.getSheetByName('Evaluations');
  const attendanceSheet = ss.getSheetByName('Attendance');
  
  // Get current month's data
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Calculate average ratings
  const evaluations = evaluationsSheet.getDataRange().getValues();
  const attendance = attendanceSheet.getDataRange().getValues();
  const employees = employeesSheet.getDataRange().getValues();
  
  let bestEmployee = null;
  let highestScore = 0;
  
  employees.slice(1).forEach(employee => {
    const employeeCode = employee[0];
    
    // Calculate average evaluation score
    const monthEvaluations = evaluations.slice(1).filter(row => {
      const date = new Date(row[0]);
      return date >= firstDayOfMonth && row[1] === employeeCode;
    });
    
    const averageRating = monthEvaluations.reduce((acc, row) => acc + row[6], 0) / 
      (monthEvaluations.length || 1);
    
    // Calculate attendance rate
    const totalDays = new Set(attendance.slice(1)
      .filter(row => new Date(row[0]) >= firstDayOfMonth)
      .map(row => row[0].toDateString())).size;
    
    const employeeAttendance = attendance.slice(1).filter(row => 
      new Date(row[0]) >= firstDayOfMonth && row[1] === employeeCode
    ).length;
    
    const attendanceRate = (employeeAttendance / totalDays) * 100;
    
    // Calculate total score (50% evaluation, 50% attendance)
    const totalScore = (averageRating * 10) * 0.5 + attendanceRate * 0.5;
    
    if (totalScore > highestScore) {
      highestScore = totalScore;
      bestEmployee = {
        name: employee[1],
        branch: employee[4],
        title: employee[2],
        averageRating: averageRating.toFixed(2),
        attendanceRate: attendanceRate.toFixed(2)
      };
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    employee: bestEmployee
  })).setMimeType(ContentService.MimeType.JSON);
}
