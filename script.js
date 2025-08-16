// Google Apps Script URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxG1UbzZmhggUpxoLJvvfjxjec2AqVHfiW_t27dxzn5JK7gZbict5X_5HXREiWl__pJIw/exec';

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.classList.remove('fa-eye');
        toggleButton.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleButton.classList.remove('fa-eye-slash');
        toggleButton.classList.add('fa-eye');
    }
}

// Check login state
function checkLoginState() {
    const loggedInBranch = localStorage.getItem('userBranch');
    if (loggedInBranch) {
        document.getElementById('loginForm').style.display = 'none';
        document.querySelector('.container').style.display = 'block';
        
        // Display branch name in all places
        document.querySelectorAll('.userBranchDisplay').forEach(element => {
            element.textContent = loggedInBranch;
        });
        document.getElementById('userBranchDisplay').textContent = loggedInBranch;
        
        // Load employee data for selected branch automatically
        loadEmployeesForManagement(loggedInBranch);
        loadEmployeesByBranch(loggedInBranch);
        loadEmployeesForEvaluation(loggedInBranch);
        loadEmployeesForPenalty(loggedInBranch);
    } else {
        document.getElementById('loginForm').style.display = 'flex';
        document.querySelector('.container').style.display = 'none';
    }
}

// Handle login submission
async function handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    const loginBtn = event.target.querySelector('.login-btn');
    const btnText = loginBtn.querySelector('.btn-text');
    const spinner = loginBtn.querySelector('.loading-spinner');
    
    // Show loading state
    btnText.style.opacity = '0';
    spinner.style.display = 'block';
    loginBtn.disabled = true;
    errorDiv.style.display = 'none';
    
    // Set login time
    localStorage.setItem('loginTime', Date.now().toString());
    
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('userBranch', data.branch);
            checkLoginState();
            errorDiv.style.display = 'none';
        } else {
            errorDiv.textContent = data.message;
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Login error occurred';
        errorDiv.style.display = 'block';
    } finally {
        // Reset button state
        btnText.style.opacity = '1';
        spinner.style.display = 'none';
        loginBtn.disabled = false;
    }
    
    return false;
}

let sessionTimeout;

// Logout function
function logout() {
    localStorage.removeItem('userBranch');
    localStorage.removeItem('loginTime');
    clearTimeout(sessionTimeout);
    checkLoginState();
}

// Reset session timer
function resetSessionTimer() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        logout();
        alert('Session expired. Please login again.');
    }, 15 * 60 * 1000); // 15 minutes
}

// Check login state when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkLoginState();
    
    // Check session time when page loads
    const loginTime = localStorage.getItem('loginTime');
    if (loginTime) {
        const timeElapsed = Date.now() - parseInt(loginTime);
        if (timeElapsed > 15 * 60 * 1000) { // 15 minutes
            logout();
            alert('Session expired. Please login again.');
        } else {
            resetSessionTimer();
        }
    }

    // Reset timer on any user activity
    ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetSessionTimer);
    });
});

// Initialize star ratings
function initializeStarRatings() {
    document.querySelectorAll('.star-rating').forEach(container => {
        container.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                const parent = this.closest('.star-rating');
                parent.setAttribute('data-rating', value);
                
                // Update star states
                parent.querySelectorAll('.star').forEach(s => {
                    if (s.getAttribute('data-value') <= value) {
                        s.classList.add('active');
                        s.textContent = '★';
                    } else {
                        s.classList.remove('active');
                        s.textContent = '☆';
                    }
                });
            });
        });
    });
}

// Employee loading functions
// Validate that at least one attendance status is selected
function validateAttendanceSelection() {
    const selectedCount = document.querySelectorAll('input[type="radio"]:checked').length;
    if (selectedCount === 0) {
        alert('الرجاء تحديد حالة الحضور لموظف واحد على الأقل');
        return false;
    }
    return true;
}


function loadEmployeesForManagement(branch) {
    const employeesListView = document.getElementById('employeesListView');

    if (!branch) {
        employeesListView.innerHTML = '<div class="alert">Please select a branch</div>';
        return;
    }

    employeesListView.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-container">
                <div class="loading-circle"></div>
                <div class="loading-text">جاري تحميل بيانات الموظفين...</div>
            </div>
        </div>
    `;

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${encodeURIComponent(branch)}`)
        .then(response => response.json())
        .then(data => {
            if (data.employees && data.employees.length > 0) {
                let tableHTML = `
                    <div class="table-container">
                        <table class="employees-table">
                            <thead>
                                <tr>
                                    <th>Employee Code</th>
                                    <th>Employee Name</th>
                                    <th>Job Title</th>
                                    <th>Phone Number</th>
                                    <th>Branch</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.employees.map(emp => `
                                    <tr>
                                        <td>${emp.code}</td>
                                        <td>${emp.name}</td>
                                        <td>${emp.title}</td>
                                        <td>${emp.phone}</td>
                                        <td>${emp.branch}</td>
                                        <td>
                                            <button class="edit-btn" onclick="showEditForm('${emp.code}', '${emp.name}', '${emp.title}', '${emp.phone}', '${emp.branch}')">
                                                <i class="fas fa-edit"></i> تعديل
                                            </button>
                                            <button class="delete-btn" onclick="deleteEmployee('${emp.code}')">
                                                <i class="fas fa-trash"></i> حذف
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`;
                employeesListView.innerHTML = tableHTML;
            } else {
                employeesListView.innerHTML = '<p class="no-data">لا يوجد موظفين في هذا الفرع</p>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            employeesListView.innerHTML = '<p class="error-message">حدث خطأ في تحميل بيانات الموظفين</p>';
        });
}


function loadEmployeesForEvaluation(branch) {
    const container = document.getElementById('employeesEvaluationList');
    
    if (!branch) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-container">
                <div class="loading-circle"></div>
                <div class="loading-text">جاري تحميل بيانات التقييم...</div>
            </div>
        </div>
    `;

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${encodeURIComponent(branch)}`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            if (data.employees && data.employees.length > 0) {
                data.employees.forEach(employee => {
                    const card = createEmployeeEvaluationCard(employee);
                    container.appendChild(card);
                });
                initializeStarRatings();
            } else {
                container.innerHTML = '<div class="no-data">لا يوجد موظفين في هذا الفرع</div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            container.innerHTML = '<div class="error">حدث خطأ في تحميل البيانات</div>';
        });
}

function loadEmployeesForPenalty(branch) {
    if (!branch) {
        document.getElementById('penaltyEmployeeSelect').innerHTML = '<option value="">اختر الموظف</option>';
        return;
    }

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${encodeURIComponent(branch)}`)
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('penaltyEmployeeSelect');
            select.innerHTML = '<option value="">اختر الموظف</option>';
            
            if (data.employees && data.employees.length > 0) {
                data.employees.forEach(employee => {
                    const option = document.createElement('option');
                    option.value = employee.code;
                    option.textContent = `${employee.name} - ${employee.title}`;
                    select.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error loading employee data');
        });
}

// عرض وإخفاء النماذج
function hideAllForms() {
    const forms = document.querySelectorAll('.form-container');
    forms.forEach(form => form.style.display = 'none');
}

function showAddEmployee() {
    hideAllForms();
    document.getElementById('addEmployeeForm').style.display = 'block';
    const branch = localStorage.getItem('userBranch');
    loadEmployeesForManagement(branch);
}

function showAttendance() {
    hideAllForms();
    document.getElementById('attendanceForm').style.display = 'block';
    const branch = localStorage.getItem('userBranch');
    loadEmployeesByBranch(branch);
}

function showEvaluation() {
    hideAllForms();
    document.getElementById('evaluationForm').style.display = 'block';
    const branch = localStorage.getItem('userBranch');
    loadEmployeesForEvaluation(branch);
    initializeStarRatings();
}

function showPenalty() {
    hideAllForms();
    document.getElementById('penaltyForm').style.display = 'block';
    const branch = localStorage.getItem('userBranch');
    loadEmployeesForPenalty(branch);
}

function showBestEmployee() {
    hideAllForms();
    document.getElementById('bestEmployeeReport').style.display = 'block';
    loadBestEmployee();
}

function createEmployeeEvaluationCard(employee) {
    const card = document.createElement('div');
    card.className = 'employee-evaluation-card';
    card.setAttribute('data-employee-id', employee.code);
    
    card.innerHTML = `
        <div class="employee-info">
            <h3>${employee.name}</h3>
            <p>${employee.title}</p>
        </div>
        <div class="evaluation-criteria">
            <div class="criteria-item">
                <label>Personal Hygiene</label>
                <div class="star-rating" data-criteria="cleanliness" data-rating="0">
                    <span class="star" data-value="1">☆</span>
                    <span class="star" data-value="2">☆</span>
                    <span class="star" data-value="3">☆</span>
                    <span class="star" data-value="4">☆</span>
                    <span class="star" data-value="5">☆</span>
                </div>
            </div>
            <div class="criteria-item">
                <label>المظهر العام</label>
                <div class="star-rating" data-criteria="appearance" data-rating="0">
                    <span class="star" data-value="1">☆</span>
                    <span class="star" data-value="2">☆</span>
                    <span class="star" data-value="3">☆</span>
                    <span class="star" data-value="4">☆</span>
                    <span class="star" data-value="5">☆</span>
                </div>
            </div>
            <div class="criteria-item">
                <label>العمل الجماعي</label>
                <div class="star-rating" data-criteria="teamwork" data-rating="0">
                    <span class="star" data-value="1">☆</span>
                    <span class="star" data-value="2">☆</span>
                    <span class="star" data-value="3">☆</span>
                    <span class="star" data-value="4">☆</span>
                    <span class="star" data-value="5">☆</span>
                </div>
            </div>
            <div class="criteria-item">
                <label>الالتزام بالمواعيد</label>
                <div class="star-rating" data-criteria="punctuality" data-rating="0">
                    <span class="star" data-value="1">☆</span>
                    <span class="star" data-value="2">☆</span>
                    <span class="star" data-value="3">☆</span>
                    <span class="star" data-value="4">☆</span>
                    <span class="star" data-value="5">☆</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

function submitAllEvaluations() {
    const container = document.getElementById('evaluationForm');
    const evaluationsList = document.getElementById('employeesEvaluationList');
    const saveButton = document.querySelector('.save-all-btn');
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-circle"></div>
            <div class="loading-text">جاري حفظ التقييمات...</div>
        </div>
    `;
    container.appendChild(loadingOverlay);
    evaluationsList.style.opacity = '0.7';
    saveButton.disabled = true;

    const evaluationCards = document.querySelectorAll('.employee-evaluation-card');
    const evaluations = [];
    
    evaluationCards.forEach(card => {
        const employeeId = card.getAttribute('data-employee-id');
        const ratings = {};
        
        card.querySelectorAll('.star-rating').forEach(rating => {
            const criteria = rating.getAttribute('data-criteria');
            const value = rating.getAttribute('data-rating');
            ratings[criteria] = value;
        });
        
        if (Object.values(ratings).some(value => value !== "0")) {
            evaluations.push({
                employeeId: employeeId,
                ...ratings,
                date: new Date().toISOString()
            });
        }
    });
    
    if (evaluations.length === 0) {
        alert('Please evaluate at least one employee');
        return;
    }

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'submitEvaluation',
            data: evaluations
        })
    })
    .then(response => response.json())
    .then(data => {
        // إزالة حالة التحميل
        container.querySelector('.loading-overlay')?.remove();
        evaluationsList.style.opacity = '1';
        saveButton.disabled = false;

        if (data.success) {
            alert('Evaluations saved successfully');
            loadEmployeesForEvaluation();
        } else {
            alert('Error saving evaluations');
        }
    })
    .catch(error => {
        // إزالة حالة التحميل
        container.querySelector('.loading-overlay')?.remove();
        evaluationsList.style.opacity = '1';
        saveButton.disabled = false;
        
        console.error('Error:', error);
        alert('System error occurred');
    });
}

// Add new employee
document.getElementById('employeeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const employeeData = {
        code: document.getElementById('empCode').value,
        name: document.getElementById('empName').value,
        title: document.getElementById('empTitle').value,
        phone: document.getElementById('empPhone').value,
        branch: document.getElementById('empBranch').value
    };

    const params = new URLSearchParams();
    params.append('action', 'addEmployee');
    params.append('data', JSON.stringify(employeeData));

    const form = document.getElementById('employeeForm');
    const formContainer = form.closest('.form-container');
    
    // إظهار حالة التحميل
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-circle"></div>
            <div class="loading-text">جاري حفظ بيانات الموظف...</div>
        </div>
    `;
    formContainer.appendChild(loadingOverlay);
    form.style.opacity = '0.7';

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });
        
        const result = await response.text();
        console.log('Response:', result);
        
        // إزالة حالة التحميل
        formContainer.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        
        alert('Employee added successfully');
        document.getElementById('employeeForm').reset();
        
        // إعادة تحميل قائمة الموظفين
        const branch = localStorage.getItem('userBranch');
        loadEmployeesForManagement(branch);
    } catch (error) {
        console.error('Error:', error);
        // إزالة حالة التحميل
        formContainer.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        alert('Error adding employee');
    }
});

// تحميل الموظفين حسب الفرع
function loadEmployeesByBranch(branch) {
    if (!branch) {
        branch = localStorage.getItem('userBranch');
    }
    if (!branch) return;

    const employeesList = document.getElementById('employeesList');
    employeesList.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-container">
                <div class="loading-circle"></div>
                <div class="loading-text">جاري تحميل البيانات...</div>
            </div>
        </div>
    `;

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${branch}`)
        .then(response => response.json())
        .then(data => {
            console.log('Received data:', data); // للتحقق من البيانات

            if (!data.success) {
                throw new Error(data.message || 'حدث خطأ في تحميل البيانات');
            }

            if (!data.employees || data.employees.length === 0) {
                employeesList.innerHTML = '<div class="alert">No employees found in this branch</div>';
                return;
            }

            // إنشاء قائمة الموظفين
            let html = '<div class="employees-grid">';
            data.employees.forEach(employee => {
                const employeeId = employee.code;
                html += `
                    <div class="employee-card" data-employee-id="${employee.code}">
                        <div class="employee-info">
                            <div class="employee-name">${employee.name}</div>
                            <div class="employee-title">${employee.title}</div>
                        </div>
                        <div class="attendance-options">
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="attendance_${employee.code}" value="Present">
                                    <span>Present</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="attendance_${employee.code}" value="Absent">
                                    <span>Absent</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="attendance_${employee.code}" value="Leave">
                                    <span>Leave</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="attendance_${employee.code}" value="Unauth Leave">
                                    <span>Unauthorized Leave</span>
                                </label>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            employeesList.innerHTML = html;
        })
        .catch(error => {
            console.error('Error:', error);
            employeesList.innerHTML = '<div class="error">Error loading employee data</div>';
        });
}


// حفظ بيانات الحضور
async function saveAttendance() {
    const attendanceForm = document.getElementById('attendanceForm');
    const employeesList = document.getElementById('employeesList');
    const saveButton = attendanceForm.querySelector('.save-btn');

    // التحقق من اختيار الفرع
    const branch = localStorage.getItem('userBranch');
    if (!branch) {
        alert('الرجاء اختيار الفرع أولاً');
        return;
    }

    // التحقق من وجود موظفين
    if (!employeesList) {
        alert('لا يوجد موظفين لتسجيل حضورهم');
        return;
    }

    // التحقق من اختيار حالة الحضور
    if (!validateAttendanceSelection()) return;

    // إظهار حالة التحميل
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-circle"></div>
            <div class="loading-text">جاري حفظ سجل الحضور...</div>
        </div>
    `;
    attendanceForm.appendChild(loadingOverlay);
    employeesList.style.opacity = '0.7';
    saveButton.disabled = true;

    // جمع بيانات الحضور
    const attendanceData = [];
    document.querySelectorAll('.employee-card').forEach(card => {
        const employeeId = card.getAttribute('data-employee-id');
        const selectedStatus = card.querySelector('input[type="radio"]:checked');
        
        if (selectedStatus) {
            attendanceData.push({
                employeeId: employeeId,
                status: selectedStatus.value,
                date: new Date().toISOString()
            });
        }
    });

    try {
        const params = new URLSearchParams();
        params.append('action', 'recordAttendance');
        params.append('data', JSON.stringify(attendanceData));

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });

        const data = await response.json();

        // إزالة حالة التحميل قبل عرض الرسائل
        loadingOverlay.remove();
        employeesList.style.opacity = '1';
        saveButton.disabled = false;

        if (data.success) {
            alert('تم تسجيل الحضور بنجاح');
            // إعادة تحميل البيانات بعد النجاح
            await loadEmployeesByBranch(branch);
        } else {
            alert('حدث خطأ أثناء تسجيل الحضور');
        }
    } catch (error) {
        // إزالة حالة التحميل في حالة الخطأ
        loadingOverlay.remove();
        employeesList.style.opacity = '1';
        saveButton.disabled = false;
        
        console.error('Error:', error);
        alert('حدث خطأ في النظام');
    }
}


// تهيئة النجوم
function initializeStarRatings() {
    document.querySelectorAll('.star-rating').forEach(container => {
        container.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                const parent = this.closest('.star-rating');
                parent.setAttribute('data-rating', value);
                
                // تحديث حالة النجوم
                parent.querySelectorAll('.star').forEach(s => {
                    if (s.getAttribute('data-value') <= value) {
                        s.classList.add('active');
                        s.textContent = '★';
                    } else {
                        s.classList.remove('active');
                        s.textContent = '☆';
                    }
                });
            });
        });
    });
}

// تقييم الموظفين
function submitEvaluation() {
    const employeeId = document.getElementById('evalEmployeeSelect').value;
    if (!employeeId) {
        alert('الرجاء اختيار موظف');
        return;
    }

    const evaluationData = {
        employeeId: employeeId,
        cleanliness: document.querySelector('.criteria-item:nth-child(1) .star-rating').getAttribute('data-rating'),
        appearance: document.querySelector('.criteria-item:nth-child(2) .star-rating').getAttribute('data-rating'),
        teamwork: document.querySelector('.criteria-item:nth-child(3) .star-rating').getAttribute('data-rating'),
        punctuality: document.querySelector('.criteria-item:nth-child(4) .star-rating').getAttribute('data-rating'),
        date: new Date().toISOString()
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'submitEvaluation',
            data: evaluationData
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('تم حفظ التقييم بنجاح');
        } else {
            alert('حدث خطأ أثناء حفظ التقييم');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('حدث خطأ في النظام');
    });
}

// إضافة جزاء
function submitPenalty() {
    const employeeId = document.getElementById('penaltyEmployeeSelect').value;
    const reason = document.getElementById('penaltyReason').value;
    const amount = document.getElementById('penaltyAmount').value;
    const form = document.getElementById('penaltyForm');
    const saveButton = form.querySelector('button');

    if (!employeeId || !reason || !amount) {
        alert('الرجاء ملء جميع الحقول');
        return;
    }

    // إظهار حالة التحميل
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-circle"></div>
            <div class="loading-text">جاري حفظ الجزاء...</div>
        </div>
    `;
    form.appendChild(loadingOverlay);
    form.style.opacity = '0.7';
    saveButton.disabled = true;

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'addPenalty',
            data: {
                employeeId: employeeId,
                reason: reason,
                amount: amount,
                date: new Date().toISOString()
            }
        })
    })
    .then(response => response.json())
    .then(data => {
        // إزالة حالة التحميل
        form.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        saveButton.disabled = false;

        if (data.success) {
            alert('تم إضافة الجزاء بنجاح');
            document.getElementById('penaltyReason').value = '';
            document.getElementById('penaltyAmount').value = '';
        } else {
            alert('حدث خطأ أثناء إضافة الجزاء');
        }
    })
    .catch(error => {
        // إزالة حالة التحميل
        form.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        saveButton.disabled = false;

        console.error('Error:', error);
        alert('حدث خطأ في النظام');
    });
}

// تحميل بيانات الموظف الأفضل
function loadBestEmployee() {
    fetch(`${GOOGLE_SCRIPT_URL}?action=getBestEmployee`)
        .then(response => response.json())
        .then(data => {
            const bestEmployeeData = document.getElementById('bestEmployeeData');
            if (data.employee) {
                bestEmployeeData.innerHTML = `
                    <h3>الموظف الأفضل لهذا الشهر</h3>
                    <p>الاسم: ${data.employee.name}</p>
                    <p>الفرع: ${data.employee.branch}</p>
                    <p>المسمى الوظيفي: ${data.employee.title}</p>
                    <p>متوسط التقييم: ${data.employee.averageRating}</p>
                    <p>نسبة الحضور: ${data.employee.attendanceRate}%</p>
                `;
            } else {
                bestEmployeeData.innerHTML = '<p>لا توجد بيانات متاحة</p>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('حدث خطأ في تحميل البيانات');
        });
}


// تهيئة زر التبديل لنموذج إضافة الموظفين
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة زر التبديل لنموذج إضافة الموظف
    const toggleButton = document.getElementById('toggleAddEmployeeForm');
    const employeeForm = document.getElementById('employeeForm');
    
    if (toggleButton && employeeForm) {
        toggleButton.addEventListener('click', function() {
            if (employeeForm.style.display === 'none') {
                employeeForm.style.display = 'block';
                toggleButton.textContent = 'إخفاء نموذج الإضافة';
            } else {
                employeeForm.style.display = 'none';
                toggleButton.textContent = 'إضافة موظف جديد';
            }
        });
    }

    // تحديث قوائم الموظفين عند تغيير الفرع
    const branchSelect = document.getElementById('branchSelect');
    const evalBranchSelect = document.getElementById('evalBranchSelect');
    const penaltyBranchSelect = document.getElementById('penaltyBranchSelect');
    const empBranchSelect = document.getElementById('empBranchSelect');

    if (branchSelect) {
        branchSelect.addEventListener('change', () => loadEmployeesByBranch(branchSelect.value));
    }
    if (evalBranchSelect) {
        evalBranchSelect.addEventListener('change', () => loadEmployeesForEvaluation(evalBranchSelect.value));
    }
    if (penaltyBranchSelect) {
        penaltyBranchSelect.addEventListener('change', () => loadEmployeesForPenalty(penaltyBranchSelect.value));
    }
    if (empBranchSelect) {
        empBranchSelect.addEventListener('change', () => loadEmployeesForManagement(empBranchSelect.value));
    }
});

// وظائف تعديل وحذف الموظفين
function showEditForm(code, name, title, phone, branch) {
    // إزالة أي نموذج موجود مسبقاً
    const existingForm = document.querySelector('.edit-form-overlay');
    if (existingForm) {
        existingForm.remove();
    }

    // إنشاء النموذج
    const editForm = document.createElement('div');
    editForm.className = 'edit-form-overlay';
    editForm.innerHTML = `
        <div class="edit-form">
            <h2>تعديل بيانات الموظف</h2>
            <form id="editEmployeeForm">
                <div class="form-group">
                    <label for="editEmpCode">كود الموظف</label>
                    <input type="text" id="editEmpCode" value="${code}" readonly>
                </div>
                <div class="form-group">
                    <label for="editEmpName">اسم الموظف</label>
                    <input type="text" id="editEmpName" value="${name}" required>
                </div>
                <div class="form-group">
                    <label for="editEmpTitle">المسمى الوظيفي</label>
                    <input type="text" id="editEmpTitle" value="${title}" required>
                </div>
                <div class="form-group">
                    <label for="editEmpPhone">رقم الهاتف</label>
                    <input type="text" id="editEmpPhone" value="${phone}" required>
                </div>
                <div class="form-group">
                    <label for="editEmpBranch">الفرع</label>
                    <input type="text" id="editEmpBranch" value="${branch}" readonly>
                </div>
                <div class="form-actions">
                    <button type="submit" class="save-btn">حفظ التغييرات</button>
                    <button type="button" class="cancel-btn" onclick="closeEditForm()">إلغاء</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(editForm);

    // إضافة مستمع الحدث للنموذج
    const form = document.getElementById('editEmployeeForm');
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const saveBtn = this.querySelector('.save-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'جاري الحفظ...';

        try {
            const employeeData = {
                code: this.querySelector('#editEmpCode').value,
                name: this.querySelector('#editEmpName').value,
                title: this.querySelector('#editEmpTitle').value,
                phone: this.querySelector('#editEmpPhone').value,
                branch: this.querySelector('#editEmpBranch').value
            };

            const params = new URLSearchParams();
            params.append('action', 'updateEmployee');
            params.append('data', JSON.stringify(employeeData));

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString()
            });

            alert('تم تحديث بيانات الموظف بنجاح');
            closeEditForm();
        } catch (error) {
            console.error('Error updating employee:', error);
            alert('حدث خطأ أثناء تحديث بيانات الموظف');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'حفظ التغييرات';
        }
    };
}
function closeEditForm() {
    const overlay = document.querySelector('.edit-form-overlay');
    if (overlay) {
        overlay.remove();
    }
}

async function deleteEmployee(code) {
    if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
        try {
            console.log('Attempting to delete employee with code:', code);

            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=deleteEmployee&data=${encodeURIComponent(code)}`, {
                method: 'POST'
            });

            console.log('Delete response received');
            
            // إعادة تحميل قائمة الموظفين بعد فترة قصيرة للتأكد من اكتمال العملية
            setTimeout(() => {

                alert('تم حذف الموظف بنجاح');
            }, 1000);

        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ في النظام: ' + error.message);
        }
    }
}


