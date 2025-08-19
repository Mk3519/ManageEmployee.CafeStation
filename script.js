// Google Apps Script URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwk_Xl7EI65w1mkuHdSy0ryyen4AjE8jJcebz0mH5axhIN07rOuK0xiQfTnOJ54m7MCmg/exec';

// Show Message Function
function showMessage(message, type = 'success') {
    // إنشاء عناصر الرسالة
    const overlay = document.createElement('div');
    overlay.className = 'message-overlay';
    
    const messageBox = document.createElement('div');
    messageBox.className = `message-box ${type}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-btn';
    closeButton.textContent = 'Close';
    
    // تجميع العناصر
    messageBox.appendChild(messageContent);
    messageBox.appendChild(closeButton);
    
    // إضافة العناصر للصفحة
    document.body.appendChild(overlay);
    document.body.appendChild(messageBox);
    
    // إظهار الرسالة
    setTimeout(() => {
        overlay.style.display = 'block';
        messageBox.style.display = 'block';
    }, 100);
    
    // إغلاق الرسالة
    const closeMessage = () => {
        overlay.style.display = 'none';
        messageBox.style.display = 'none';
        setTimeout(() => {
            document.body.removeChild(overlay);
            document.body.removeChild(messageBox);
        }, 300);
    };
    
    // إضافة مستمعي الأحداث
    closeButton.onclick = closeMessage;
    overlay.onclick = closeMessage;
    
    // إغلاق تلقائي بعد 3 ثواني
    setTimeout(closeMessage, 3000);
}

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
        
        // عرض القائمة المنسدلة للفروع إذا كان المستخدم يملك صلاحية All Branches
        if (loggedInBranch === 'All Branches') {
            document.getElementById('branchSelector').style.display = 'block';
            const selectedBranch = localStorage.getItem('selectedBranch');
            if (selectedBranch) {
                // تحديث القائمة المنسدلة بالفرع المحدد
                document.getElementById('branchSelect').value = selectedBranch;
                // تحديث جميع النماذج بالفرع المحدد
                updateAllForms(selectedBranch);
            }
        } else {
            document.getElementById('branchSelector').style.display = 'none';
            document.querySelectorAll('.userBranchDisplay').forEach(element => {
                element.textContent = loggedInBranch;
            });
            updateAllForms(loggedInBranch);
        }
    } else {
        document.getElementById('loginForm').style.display = 'flex';
        document.querySelector('.container').style.display = 'none';
    }
}

// دالة جديدة لتحميل قائمة الفروع
async function loadBranches() {
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBranches`);
        const data = await response.json();
        
        if (data.success) {
            const branchSelect = document.getElementById('branchSelect');
            branchSelect.innerHTML = '<option value="">Select the branch</option>';
            
            data.branches.forEach(branch => {
                if (branch !== 'All Branches') {
                    const option = document.createElement('option');
                    option.value = branch;
                    option.textContent = branch;
                    branchSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

// دالة جديدة للتعامل مع تغيير الفرع
function handleBranchChange(selectedBranch) {
    if (!selectedBranch) return;
    
    // تحديث الفرع المحدد في التخزين المحلي
    localStorage.setItem('selectedBranch', selectedBranch);
    
    // تحديث عرض اسم الفرع في جميع النماذج
    document.querySelectorAll('.userBranchDisplay').forEach(element => {
        element.textContent = selectedBranch;
    });
    
    // تحديث النموذج الحالي المفتوح
    updateCurrentForm(selectedBranch);
}

// دالة جديدة لتحديث النموذج الحالي
function updateCurrentForm(branch) {
    const forms = {
        'addEmployeeForm': loadEmployeesForManagement,
        'attendanceForm': loadEmployeesByBranch,
        'evaluationForm': loadEmployeesForEvaluation,
        'penaltyForm': loadEmployeesForPenalty,
        'bestEmployeeReport': loadBestEmployee,
        'employeeReportForm': loadEmployeesForReport
    };

    // تحديث عرض الفرع في جميع الأماكن
    document.querySelectorAll('.userBranchDisplay').forEach(element => {
        element.textContent = branch;
    });
    document.getElementById('empBranch').value = branch;

    for (const [formId, updateFunction] of Object.entries(forms)) {
        const form = document.getElementById(formId);
        if (form && form.style.display !== 'none') {
            showMessage(`جاري تحديث ${formId} للفرع ${branch}`, 'success');
            // إضافة مؤشر التحميل
            form.innerHTML = `
                <div class="loading-overlay">
                    <div class="loading-container">
                        <div class="loading-circle"></div>
                        <div class="loading-text">Loading data...</div>
                    </div>
                </div>` + form.innerHTML;
            
            // تحديث البيانات
            updateFunction(branch);
            
            // إزالة مؤشر التحميل بعد ثانية
            setTimeout(() => {
                const overlay = form.querySelector('.loading-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }, 1000);
            
            break;
        }
    }
}

// دالة جديدة لتحديث جميع النماذج
function updateAllForms(branch) {
    // تحديث قائمة الموظفين في نموذج إدارة الموظفين
    loadEmployeesForManagement(branch);
    
    // تحديث قائمة الحضور
    loadEmployeesByBranch(branch);
    
    // تحديث قائمة التقييم
    loadEmployeesForEvaluation(branch);
    
    // تحديث قائمة الجزاءات
    loadEmployeesForPenalty(branch);
    
    // تحديث قائمة التقارير
    loadEmployeesForReport(branch);
    
    // تحديث تقرير أفضل موظف
    loadBestEmployee(branch);
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
            if (data.branch === 'All Branches') {
                localStorage.setItem('isAdmin', 'true');
            }
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
    // Clear ALL data from localStorage
    localStorage.clear();
    
    // Stop the session timer
    clearTimeout(sessionTimeout);
    
    // Reset login form and container visibility
    document.getElementById('loginForm').style.display = 'flex';
    document.querySelector('.container').style.display = 'none';
    
    // Clear login form inputs
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    
    // Hide any error messages
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }

    // Reset all form containers to empty state
    resetAllForms();
    
    // Hide all forms
    hideAllForms();
    
    // Force page reload to ensure complete reset
    window.location.reload();
}

// Helper function to reset all forms
function resetAllForms() {
    const resetElements = {
        'employeesListView': '<div class="no-data">No employees data</div>',
        'employeeForm': '',
        'employeesList': '<div class="no-data">No attendance data</div>',
        'employeesEvaluationList': '<div class="no-data">No evaluation data</div>',
        'penaltyEmployeeSelect': '<option value="">Select employee</option>',
        'penaltyReason': '',
        'penaltyAmount': '',
        'reportEmployeeSelect': '<option value="">Select employee</option>',
        'reportType': '',
        'reportResults': '',
        'bestEmployeeData': '<div class="no-data">No best employee data</div>',
        'branchSelect': '<option value="">Select Branch</option>'
    };

    Object.entries(resetElements).forEach(([id, content]) => {
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === 'SELECT') {
                element.innerHTML = content;
            } else if (element.tagName === 'INPUT') {
                element.value = '';
            } else {
                element.innerHTML = content;
            }
        }
    });

    // Reset all branch displays
    document.querySelectorAll('.userBranchDisplay').forEach(element => {
        element.textContent = '';
    });
}

// Reset session timer
function resetSessionTimer() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        logout();
        showMessage('Session expired. Please login again.', 'error');
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
            showMessage('انتهت الجلسة. الرجاء تسجيل الدخول مرة أخرى', 'error');
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
        showMessage('Please select attendance status for at least one employee', 'error');
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
                <div class="loading-text">Loading employee data...</div>
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
                                    <th>Code</th>
                                    <th>Employee Name</th>
                                    <th>Job Title</th>
                                    <th>Phone</th>
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

                                            <button class="delete-btn" onclick="deleteEmployee('${emp.code}')">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`;
                employeesListView.innerHTML = tableHTML;
            } else {
                employeesListView.innerHTML = '<p class="no-data">There are no employees in this branch</p>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            employeesListView.innerHTML = '<p class="error-message">Error loading employee data</p>';
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
                <div class="loading-text">Loading evaluation data...</div>
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
                container.innerHTML = '<div class="no-data">There are no employees in this branch</div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            container.innerHTML = '<div class="error">Error loading data</div>';
        });
}

function loadEmployeesForPenalty(branch) {
    if (!branch) {
        document.getElementById('penaltyEmployeeSelect').innerHTML = '<option value="">Select employee</option>';
        return;
    }

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${encodeURIComponent(branch)}`)
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('penaltyEmployeeSelect');
            select.innerHTML = '<option value="">Select employee</option>';
            
            if (data.employees && data.employees.length > 0) {
                data.employees.forEach(employee => {
                    const option = document.createElement('option');
                    option.value = employee.code;
                    option.textContent = `${employee.name} - ${employee.title}`;
                    select.appendChild(option);
                });
            }
        })

}

// عرض وإخفاء النماذج
function hideAllForms() {
    const forms = document.querySelectorAll('.form-container');
    forms.forEach(form => form.style.display = 'none');
}

function showAddEmployee() {
    hideAllForms();
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    const employeeForm = document.getElementById('employeeForm');
    const toggleButton = document.getElementById('toggleAddEmployeeForm');
    
    // تحديث عرض الفرع أولاً
    const selectedBranch = localStorage.getItem('selectedBranch') || localStorage.getItem('userBranch');
    document.getElementById('empBranch').value = selectedBranch;
    document.querySelectorAll('.userBranchDisplay').forEach(element => {
        element.textContent = selectedBranch;
    });
    
    // عرض النموذج وتحميل البيانات
    addEmployeeForm.style.display = 'block';
    employeeForm.style.display = 'none';
    toggleButton.textContent = 'Add New Employee';
    
    // تحميل قائمة الموظفين
    loadEmployeesForManagement(selectedBranch);

    // إضافة مستمع الحدث للزر
    toggleButton.onclick = function() {
        if (employeeForm.style.display === 'none') {
            employeeForm.style.display = 'block';
            this.textContent = 'Cancel';
            // تأكد من تحديث قيمة الفرع في النموذج
            document.getElementById('empBranch').value = selectedBranch;
        } else {
            employeeForm.style.display = 'none';
            this.textContent = 'Add New Employee';
            employeeForm.reset();
            document.getElementById('empBranch').value = selectedBranch;
        }
    };
}

function showAttendance() {
    hideAllForms();
    document.getElementById('attendanceForm').style.display = 'block';
    const selectedBranch = localStorage.getItem('selectedBranch') || localStorage.getItem('userBranch');
    loadEmployeesByBranch(selectedBranch);
}

function showEvaluation() {
    hideAllForms();
    document.getElementById('evaluationForm').style.display = 'block';
    const selectedBranch = localStorage.getItem('selectedBranch') || localStorage.getItem('userBranch');
    loadEmployeesForEvaluation(selectedBranch);
    initializeStarRatings();
}

function showPenalty() {
    hideAllForms();
    document.getElementById('penaltyForm').style.display = 'block';
    const selectedBranch = localStorage.getItem('selectedBranch') || localStorage.getItem('userBranch');
    loadEmployeesForPenalty(selectedBranch);
}

function showBestEmployee() {
    hideAllForms();
    document.getElementById('bestEmployeeReport').style.display = 'block';
    const selectedBranch = localStorage.getItem('selectedBranch') || localStorage.getItem('userBranch');
    loadBestEmployee(selectedBranch);
}

function showEmployeeReport() {
    hideAllForms();
    document.getElementById('employeeReportForm').style.display = 'block';
    const selectedBranch = localStorage.getItem('selectedBranch') || localStorage.getItem('userBranch');
    loadEmployeesForReport(selectedBranch);
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
            <div class="loading-text">Saving reviews...</div>
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
        showMessage('الرجاء تقييم موظف واحد على الأقل', 'error');
        container.querySelector('.loading-overlay')?.remove();
        evaluationsList.style.opacity = '1';
        saveButton.disabled = false;
        return;
    }

    // التحقق من صحة القيم
    const invalidEvaluations = evaluations.filter(eval => 
        !eval.cleanliness || !eval.appearance || !eval.teamwork || !eval.punctuality ||
        eval.cleanliness === "0" || eval.appearance === "0" || eval.teamwork === "0" || eval.punctuality === "0"
    );

    if (invalidEvaluations.length > 0) {
        showMessage('الرجاء إكمال جميع معايير التقييم لكل موظف تم اختياره', 'error');
        container.querySelector('.loading-overlay')?.remove();
        evaluationsList.style.opacity = '1';
        saveButton.disabled = false;
        return;
    }

    const params = new URLSearchParams();
    params.append('action', 'submitEvaluation');
    params.append('data', JSON.stringify(evaluations));

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
    })
    .then(response => response.json())
    .then(data => {
        // إزالة حالة التحميل
        container.querySelector('.loading-overlay')?.remove();
        evaluationsList.style.opacity = '1';
        saveButton.disabled = false;

        if (data.success) {
            showMessage('Reviews have been saved successfully', 'success');
            loadEmployeesForEvaluation();
        } else {
            showMessage('Error saving evaluations', 'error');
        }
    })
    .catch(error => {
        // إزالة حالة التحميل
        container.querySelector('.loading-overlay')?.remove();
        evaluationsList.style.opacity = '1';
        saveButton.disabled = false;
        
        console.error('Error:', error);
        showMessage('System error occurred', 'error');
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
            <div class="loading-text">Saving employee data...</div>
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
        // إزالة حالة التحميل
        formContainer.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        
        showMessage('تم إضافة الموظف بنجاح', 'success');
        document.getElementById('employeeForm').reset();
        
        // إعادة تحميل قائمة الموظفين
        const branch = localStorage.getItem('userBranch');
        loadEmployeesForManagement(branch);
    } catch (error) {
        // إزالة حالة التحميل
        formContainer.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        showMessage('حدث خطأ أثناء إضافة الموظف', 'error');
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
                <div class="loading-text">Loading data...</div>
            </div>
        </div>
    `;

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${branch}`)
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.message || 'Error loading data');
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
                                    <input type="radio" name="attendance_${employee.code}" value="vacation">
                                    <span>Vacation</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="attendance_${employee.code}" value="Leave a vacation">
                                    <span>Leave a vacation</span>
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
            showMessage('حدث خطأ أثناء تحميل بيانات الموظفين', 'error');
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
        showMessage('الرجاء اختيار الفرع أولاً', 'error');
        return;
    }

    // التحقق من وجود موظفين
    if (!employeesList) {
        showMessage('لا يوجد موظفين لتسجيل حضورهم', 'error');
        return;
    }

    // التحقق من اختيار حالة الحضور
    const selectedCount = document.querySelectorAll('input[type="radio"]:checked').length;
    if (selectedCount === 0) {
        showMessage('الرجاء اختيار حالة الحضور لموظف واحد على الأقل', 'error');
        return;
    }

    // إظهار حالة التحميل
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-circle"></div>
            <div class="loading-text">Saving attendance record...</div>
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
            showMessage('تم تسجيل الحضور بنجاح', 'success');
            // إعادة تحميل البيانات بعد النجاح
            await loadEmployeesByBranch(branch);
        } else {
            showMessage('حدث خطأ أثناء تسجيل الحضور', 'error');
        }
    } catch (error) {
        // إزالة حالة التحميل في حالة الخطأ
        loadingOverlay.remove();
        employeesList.style.opacity = '1';
        saveButton.disabled = false;
        
        console.error('Error:', error);
        showMessage('A system error has occurred', 'error');
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
        showMessage('الرجاء اختيار موظف', 'error');
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
            showMessage('The evaluation has been saved successfully', 'success');
        } else {
            showMessage('Error saving evaluation', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('حدث خطأ في النظام', 'error');
    });
}

// إضافة جزاء
function submitPenalty() {
    const employeeId = document.getElementById('penaltyEmployeeSelect').value;
    const reason = document.getElementById('penaltyReason').value;
    const deductionPeriod = document.getElementById('penaltyAmount').value;
    const form = document.getElementById('penaltyForm');
    const saveButton = form.querySelector('button');

    if (!employeeId || !reason || !deductionPeriod) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    // إظهار حالة التحميل
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-circle"></div>
            <div class="loading-text">The penalty is being saved...</div>
        </div>
    `;
    form.appendChild(loadingOverlay);
    form.style.opacity = '0.7';
    saveButton.disabled = true;

    const params = new URLSearchParams();
    params.append('action', 'addPenalty');
    params.append('data', JSON.stringify({
        employeeId: employeeId,
        reason: reason,
        deductionPeriod: deductionPeriod,
        date: new Date().toISOString()
    }));

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
    })
    .then(response => response.json())
    .then(data => {
        // إزالة حالة التحميل
        form.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        saveButton.disabled = false;

        if (data.success) {
            showMessage('Penalty added successfully', 'success');
            document.getElementById('penaltyReason').value = '';
            document.getElementById('penaltyAmount').value = '';
        } else {
            showMessage('Error adding penalty', 'error');
        }
    })
    .catch(error => {
        // إزالة حالة التحميل
        form.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        saveButton.disabled = false;

        console.error('Error:', error);
        showMessage('A system error has occurred', 'error');
    });
}

// تحميل بيانات الموظف الأفضل
function loadBestEmployee(branch) {
    const bestEmployeeData = document.getElementById('bestEmployeeData');
    
    bestEmployeeData.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-container">
                <div class="loading-circle"></div>
                <div class="loading-text">Loading best employee data...</div>
            </div>
        </div>
    `;

    fetch(`${GOOGLE_SCRIPT_URL}?action=getBestEmployee&branch=${encodeURIComponent(branch)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.employee) {
                const attendanceRate = parseFloat(data.employee.attendanceRate).toFixed(2);
                const evaluationRate = parseFloat(data.employee.evaluationRate).toFixed(2);
                const finalScore = parseFloat(data.employee.finalScore).toFixed(2);

                bestEmployeeData.innerHTML = `
                    <div class="best-employee-card">
                        <h3>Best Employee for ${new Date().toLocaleString('en-US', { month: 'long' })}</h3>
                        <div class="employee-details">
                            <div class="stat-group">
                                <div class="stat-item">
                                    <span class="stat-label">Name:</span>
                                    <span class="stat-value">${data.employee.name}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Branch:</span>
                                    <span class="stat-value">${data.employee.branch}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Position:</span>
                                    <span class="stat-value">${data.employee.title}</span>
                                </div>
                            </div>
                        </div>
                        <div class="ratings-section">
                            <h4>Performance Details</h4>
                            <div class="rating-items">
                                <div class="rating-item">
                                    <div class="rating-header">
                                        <span class="rating-label">Attendance Rate (40%)</span>
                                        <span class="rating-value">${attendanceRate}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: ${attendanceRate}%"></div>
                                    </div>
                                </div>
                                <div class="rating-item">
                                    <div class="rating-header">
                                        <span class="rating-label">Evaluation Rate (60%)</span>
                                        <span class="rating-value">${evaluationRate}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: ${evaluationRate}%"></div>
                                    </div>
                                </div>
                                ${data.employee.hasPenalty ? `
                                    <div class="penalty-warning">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        Penalty deduction applied
                                    </div>
                                ` : ''}
                                <div class="final-score">
                                    <div class="rating-header">
                                        <span class="rating-label">Final Score</span>
                                        <span class="rating-value">${finalScore}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: ${finalScore}%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                bestEmployeeData.innerHTML = '<div class="no-data">No data available for this month</div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            bestEmployeeData.innerHTML = '<div class="error-message">Error loading data</div>';
        });
}


// تهيئة زر التبديل لنموذج إضافة الموظفين
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة زر التبديل لنموذج إضافة الموظف
    const toggleButton = document.getElementById('toggleAddEmployeeForm');
    const employeeForm = document.getElementById('employeeForm');
    
    if (toggleButton && employeeForm) {
        toggleButton.addEventListener('click', function() {
            const isHidden = employeeForm.style.display === 'none';
            employeeForm.style.display = isHidden ? 'block' : 'none';
            toggleButton.textContent = isHidden ? 'Cancel' : 'Add New Employee';
            
            // مسح البيانات عند الإغلاق
            if (!isHidden) {
                employeeForm.reset();
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


async function deleteEmployee(code) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            showMessage('جاري حذف الموظف...', 'success');

            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=deleteEmployee&data=${encodeURIComponent(code)}`, {
                method: 'POST'
            });
            
            // إعادة تحميل قائمة الموظفين بعد فترة قصيرة للتأكد من اكتمال العملية
            setTimeout(() => {
                showMessage('تم حذف الموظف بنجاح', 'success');
            }, 1000);

        } catch (error) {
            showMessage('حدث خطأ في النظام: ' + error.message, 'error');
        }
    }
}

// تحميل قائمة الموظفين للتقرير
function loadEmployeesForReport(branch) {
    if (!branch) return;

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${encodeURIComponent(branch)}`)
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('reportEmployeeSelect');
            select.innerHTML = '<option value="">Select employee</option>';
            
            if (data.employees && data.employees.length > 0) {
                data.employees.forEach(employee => {
                    const option = document.createElement('option');
                    option.value = employee.code;
                    option.textContent = `${employee.name} - ${employee.title}`;
                    select.appendChild(option);
                });
            }
        })

}

// إنشاء التقرير
async function generateReport() {
    const employeeId = document.getElementById('reportEmployeeSelect').value;
    const reportType = document.getElementById('reportType').value;
    const reportMonth = document.getElementById('reportMonth').value; // Get selected month
    const resultsContainer = document.getElementById('reportResults');
    
    if (!employeeId || !reportType || !reportMonth) {
        showMessage('الرجاء اختيار الموظف ونوع التقرير والشهر', 'error');
        return;
    }

    // إظهار حالة التحميل
    resultsContainer.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-container">
                <div class="loading-circle"></div>
                <div class="loading-text">Loading report...</div>
            </div>
        </div>
    `;

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployeeReport&employeeId=${employeeId}&reportType=${reportType}&month=${reportMonth}`);
        const data = await response.json();

        if (data.success) {
            // Filter data for selected month only
            const selectedDate = new Date(reportMonth);
            const filteredData = data.data.filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.getMonth() === selectedDate.getMonth() && 
                       recordDate.getFullYear() === selectedDate.getFullYear();
            });

            // Display filtered data
            switch(reportType) {
                case 'attendance':
                    displayAttendanceReport(filteredData);
                    break;
                case 'evaluation':
                    displayEvaluationReport(filteredData);
                    break;
                case 'penalty':
                    displayPenaltyReport(filteredData);
                    break;
            }
        } else {
            resultsContainer.innerHTML = `<div class="error-message">Error loading report: ${data.error}</div>`;
        }
    } catch (error) {
        showMessage('حدث خطأ أثناء تحميل التقرير', 'error');
        resultsContainer.innerHTML = '<div class="error-message">Error loading report</div>';
    }
}

// Update display functions to show month in header
function displayAttendanceReport(data) {
    const resultsContainer = document.getElementById('reportResults');
    const selectedMonth = document.getElementById('reportMonth').value;
    const monthDisplay = new Date(selectedMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    if (!Array.isArray(data) || data.length === 0) {
        resultsContainer.innerHTML = `<div class="no-data">No attendance records found for ${monthDisplay}</div>`;
        return;
    }

    const translateStatus = {
        'Present': 'Present',
        'Absent': 'Absent',
        'vacation': 'vacation',
        'Leave a vacation': 'Leave a vacation'
    };

    const monthlyData = data.reduce((acc, record) => {
        const date = new Date(record.date);
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(record);
        return acc;
    }, {});

    let html = '';
    
    Object.entries(monthlyData).forEach(([monthYear, records]) => {
        const stats = calculateAttendanceStats(records);
        
        html += `
            <div class="month-section">
                <h3>${monthYear}</h3>
                <div class="attendance-stats">
                    <div class="stat-item">
                        <span class="stat-label">Attendance Rate:</span>
                        <span class="stat-value">${stats.presentPercentage}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Present Days:</span>
                        <span class="stat-value">${stats.presentDays}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Absent Days:</span>
                        <span class="stat-value">${stats.absentDays}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">vacation Days:</span>
                        <span class="stat-value">${stats.leaveDays}</span>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Day</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(record => {
                                const date = new Date(record.date);
                                const status = translateStatus[record.status] || record.status;
                                const statusClass = record.status.toLowerCase().replace(' ', '-');
                                
                                return `
                                    <tr>
                                        <td>${date.toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric'
                                        })}</td>
                                        <td>${date.toLocaleDateString('en-US', { weekday: 'long' })}</td>
                                        <td class="status ${statusClass}">${status}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    resultsContainer.innerHTML = html;
}

// دالة لحساب إحصائيات الحضور
function calculateAttendanceStats(data) {
    const presentDays = data.filter(record => record.status === 'Present').length;
    const absentDays = data.filter(record => record.status === 'Absent' || record.status === 'Unauth Leave').length;
    const leaveDays = data.filter(record => record.status === 'vacation').length;
    const totalDays = data.length;
    
    return {
        presentDays,
        absentDays,
        leaveDays,
        presentPercentage: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0.0'
    };
}

// عرض تقرير التقييمات
function displayEvaluationReport(data) {
    const resultsContainer = document.getElementById('reportResults');
    const selectedMonth = document.getElementById('reportMonth').value;
    const monthDisplay = new Date(selectedMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    if (!Array.isArray(data) || data.length === 0) {
        resultsContainer.innerHTML = `<div class="no-data">No evaluation records found for ${monthDisplay}</div>`;
        return;
    }

    // Calculate monthly averages
    const monthlyData = data.reduce((acc, record) => {
        const date = new Date(record.date);
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(record);
        return acc;
    }, {});

    let html = '';
    
    // Display data for each month
    Object.entries(monthlyData).forEach(([monthYear, records]) => {
        const monthlyAverages = calculateMonthlyAverages(records);
        
        html += `
            <div class="month-section">
                <h3>${monthYear}</h3>
                <div class="evaluation-stats">
                    <div class="stat-item">
                        <span class="stat-label">Personal Hygiene:</span>
                        <span class="stat-value">${monthlyAverages.cleanliness}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Appearance:</span>
                        <span class="stat-value">${monthlyAverages.appearance}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Teamwork:</span>
                        <span class="stat-value">${monthlyAverages.teamwork}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Punctuality:</span>
                        <span class="stat-value">${monthlyAverages.punctuality}</span>
                    </div>
                    <div class="stat-item total">
                        <span class="stat-label">Monthly Average:</span>
                        <span class="stat-value">${monthlyAverages.total}</span>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Personal Hygiene</th>
                                <th>Appearance</th>
                                <th>Teamwork</th>
                                <th>Punctuality</th>
                                <th>Daily Average</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(record => {
                                const date = new Date(record.date);
                                const dailyAverage = ((
                                    Number(record.cleanliness) +
                                    Number(record.appearance) +
                                    Number(record.teamwork) +
                                    Number(record.punctuality)
                                ) / 4).toFixed(2);
                                
                                return `
                                    <tr>
                                        <td>${date.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}</td>
                                        <td>${record.cleanliness}</td>
                                        <td>${record.appearance}</td>
                                        <td>${record.teamwork}</td>
                                        <td>${record.punctuality}</td>
                                        <td>${dailyAverage}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    resultsContainer.innerHTML = html;
}

function calculateMonthlyAverages(records) {
    const totals = records.reduce((acc, record) => {
        acc.cleanliness += Number(record.cleanliness);
        acc.appearance += Number(record.appearance);
        acc.teamwork += Number(record.teamwork);
        acc.punctuality += Number(record.punctuality);
        return acc;
    }, {
        cleanliness: 0,
        appearance: 0,
        teamwork: 0,
        punctuality: 0
    });

    const count = records.length;
    const averages = {
        cleanliness: (totals.cleanliness / count).toFixed(2),
        appearance: (totals.appearance / count).toFixed(2),
        teamwork: (totals.teamwork / count).toFixed(2),
        punctuality: (totals.punctuality / count).toFixed(2)
    };

    averages.total = ((
        Number(averages.cleanliness) +
        Number(averages.appearance) +
        Number(averages.teamwork) +
        Number(averages.punctuality)
    ) / 4).toFixed(2);

    return averages;
}

// عرض تقرير الجزاءات
function displayPenaltyReport(data) {
    const resultsContainer = document.getElementById('reportResults');
    const selectedMonth = document.getElementById('reportMonth').value;
    const monthDisplay = new Date(selectedMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    if (!Array.isArray(data) || data.length === 0) {
        resultsContainer.innerHTML = `<div class="no-data">No penalty records found for ${monthDisplay}</div>`;
        return;
    }

    // تجميع البيانات حسب الشهر
    const monthlyData = data.reduce((acc, record) => {
        const date = new Date(record.date);
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(record);
        return acc;
    }, {});

    let html = '';
    
    // عرض البيانات لكل شهر
    Object.entries(monthlyData).forEach(([monthYear, records]) => {
        const stats = calculatePenaltyStats(records);
        
        html += `
            <div class="month-section">
                <h3>${monthYear}</h3>
                <div class="penalty-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Penalties:</span>
                        <span class="stat-value">${stats.totalPenalties}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Deduction Days:</span>
                        <span class="stat-value">${stats.totalDays}</span>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Reason</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(record => `
                                <tr>
                                    <td>${new Date(record.date).toLocaleDateString('EG')}</td>
                                    <td>${record.reason}</td>
                                    <td>${record.amount}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    resultsContainer.innerHTML = html;
}

// دالة لحساب إحصائيات الجزاءات
function calculatePenaltyStats(data) {
    const totalPenalties = data.length;
    
    // حساب إجمالي أيام الخصم
    const daysMapping = {
        'ربع يوم': 0.25,
        'نصف يوم': 0.5,
        'يوم': 1,
        'ثلاثة ايام': 3
    };
    
    const totalDays = data.reduce((sum, record) => {
        return sum + (daysMapping[record.amount] || 0);
    }, 0);

    return {
        totalPenalties,
        totalDays: totalDays.toFixed(2)
    };
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
        showMessage('الرجاء اختيار موظف', 'error');
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
            showMessage('The evaluation has been saved successfully', 'success');
        } else {
            showMessage('Error saving evaluation', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('حدث خطأ في النظام', 'error');
    });
}

// إضافة جزاء
function submitPenalty() {
    const employeeId = document.getElementById('penaltyEmployeeSelect').value;
    const reason = document.getElementById('penaltyReason').value;
    const deductionPeriod = document.getElementById('penaltyAmount').value;
    const form = document.getElementById('penaltyForm');
    const saveButton = form.querySelector('button');

    if (!employeeId || !reason || !deductionPeriod) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    // إظهار حالة التحميل
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-circle"></div>
            <div class="loading-text">The penalty is being saved...</div>
        </div>
    `;
    form.appendChild(loadingOverlay);
    form.style.opacity = '0.7';
    saveButton.disabled = true;

    const params = new URLSearchParams();
    params.append('action', 'addPenalty');
    params.append('data', JSON.stringify({
        employeeId: employeeId,
        reason: reason,
        deductionPeriod: deductionPeriod,
        date: new Date().toISOString()
    }));

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
    })
    .then(response => response.json())
    .then(data => {
        // إزالة حالة التحميل
        form.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        saveButton.disabled = false;

        if (data.success) {
            showMessage('Penalty added successfully', 'success');
            document.getElementById('penaltyReason').value = '';
            document.getElementById('penaltyAmount').value = '';
        } else {
            showMessage('Error adding penalty', 'error');
        }
    })
    .catch(error => {
        // إزالة حالة التحميل
        form.querySelector('.loading-overlay')?.remove();
        form.style.opacity = '1';
        saveButton.disabled = false;

        console.error('Error:', error);
        showMessage('A system error has occurred', 'error');
    });
}

// تحميل بيانات الموظف الأفضل
function loadBestEmployee(branch) {
    const bestEmployeeData = document.getElementById('bestEmployeeData');
    
    bestEmployeeData.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-container">
                <div class="loading-circle"></div>
                <div class="loading-text">Loading best employee data...</div>
            </div>
        </div>
    `;

    fetch(`${GOOGLE_SCRIPT_URL}?action=getBestEmployee&branch=${encodeURIComponent(branch)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.employee) {
                const attendanceRate = parseFloat(data.employee.attendanceRate).toFixed(2);
                const evaluationRate = parseFloat(data.employee.evaluationRate).toFixed(2);
                const finalScore = parseFloat(data.employee.finalScore).toFixed(2);

                bestEmployeeData.innerHTML = `
                    <div class="best-employee-card">
                        <h3>Best Employee for ${new Date().toLocaleString('en-US', { month: 'long' })}</h3>
                        <div class="employee-details">
                            <div class="stat-group">
                                <div class="stat-item">
                                    <span class="stat-label">Name:</span>
                                    <span class="stat-value">${data.employee.name}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Branch:</span>
                                    <span class="stat-value">${data.employee.branch}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Position:</span>
                                    <span class="stat-value">${data.employee.title}</span>
                                </div>
                            </div>
                        </div>
                        <div class="ratings-section">
                            <h4>Performance Details</h4>
                            <div class="rating-items">
                                <div class="rating-item">
                                    <div class="rating-header">
                                        <span class="rating-label">Attendance Rate (40%)</span>
                                        <span class="rating-value">${attendanceRate}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: ${attendanceRate}%"></div>
                                    </div>
                                </div>
                                <div class="rating-item">
                                    <div class="rating-header">
                                        <span class="rating-label">Evaluation Rate (60%)</span>
                                        <span class="rating-value">${evaluationRate}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: ${evaluationRate}%"></div>
                                    </div>
                                </div>
                                ${data.employee.hasPenalty ? `
                                    <div class="penalty-warning">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        Penalty deduction applied
                                    </div>
                                ` : ''}
                                <div class="final-score">
                                    <div class="rating-header">
                                        <span class="rating-label">Final Score</span>
                                        <span class="rating-value">${finalScore}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: ${finalScore}%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                bestEmployeeData.innerHTML = '<div class="no-data">No data available for this month</div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            bestEmployeeData.innerHTML = '<div class="error-message">Error loading data</div>';
        });
}


// تهيئة زر التبديل لنموذج إضافة الموظفين
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة زر التبديل لنموذج إضافة الموظف
    const toggleButton = document.getElementById('toggleAddEmployeeForm');
    const employeeForm = document.getElementById('employeeForm');
    
    if (toggleButton && employeeForm) {
        toggleButton.addEventListener('click', function() {
            const isHidden = employeeForm.style.display === 'none';
            employeeForm.style.display = isHidden ? 'block' : 'none';
            toggleButton.textContent = isHidden ? 'Cancel' : 'Add New Employee';
            
            // مسح البيانات عند الإغلاق
            if (!isHidden) {
                employeeForm.reset();
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


