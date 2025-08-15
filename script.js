// Google Apps Script URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSDQ_tZTCw7IisRQWt1PnOOIOtPsOAiGInRrvcytThUde8NqPULS--KSRvL88Mk6rlog/exec';

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

// وظائف تحميل الموظفين
// التحقق من تحديد حالة حضور واحدة فقط
function validateAttendanceSelection() {
    const selectedCount = document.querySelectorAll('input[type="radio"]:checked').length;
    if (selectedCount === 0) {
        alert('الرجاء تحديد حالة الحضور لموظف واحد على الأقل');
        return false;
    }
    return true;
}

// حفظ بيانات الحضور
async function saveAttendance() {
    try {
        // التحقق من اختيار الفرع
        const branch = document.getElementById('branchSelect').value;
        if (!branch) {
            alert('الرجاء اختيار الفرع أولاً');
            return;
        }

        // التحقق من اختيار حالة الحضور
        if (!validateAttendanceSelection()) return;
        
        // جمع بيانات الحضور
        const selectedOptions = [];
        document.querySelectorAll('.employee-card').forEach(card => {
            const employeeId = card.dataset.employeeId;
            const selectedRadio = card.querySelector('input[type="radio"]:checked');
            if (selectedRadio) {
                selectedOptions.push({
                    employeeId: employeeId,
                    status: selectedRadio.value,
                    date: new Date().toISOString().split('T')[0]
                });
            }
        });

        // إظهار حالة التحميل
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'جاري الحفظ...';
        
        const employeesList = document.getElementById('employeesList');
        employeesList.style.opacity = '0.7';

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-message';
        loadingDiv.textContent = 'جاري حفظ بيانات الحضور...';
        employeesList.parentNode.insertBefore(loadingDiv, employeesList.nextSibling);

        // إرسال البيانات باستخدام fetch
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'recordAttendance',
                data: selectedOptions
            })
        });

        // إزالة أي رسائل سابقة
        const oldMessages = document.querySelectorAll('.success-message, .error-message');
        oldMessages.forEach(msg => msg.remove());

        // عرض رسالة نجاح بعد فترة قصيرة
        setTimeout(() => {
            alert('تم حفظ بيانات الحضور بنجاح');
        }, 1000);

    } catch (error) {
        alert('حدث خطأ: ' + error.message);
    }
}

function loadEmployeesForManagement() {
    const branch = document.getElementById('empBranchSelect').value;
    const employeesListView = document.getElementById('employeesListView');

    if (!branch || branch === '-- اختر الفرع --') {
        employeesListView.innerHTML = '<div class="alert">الرجاء اختيار الفرع</div>';
        return;
    }

    employeesListView.innerHTML = '<div class="loading">جاري تحميل بيانات الموظفين...</div>';

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${encodeURIComponent(branch)}`)
        .then(response => response.json())
        .then(data => {
            if (data.employees && data.employees.length > 0) {
                let tableHTML = `
                    <div class="table-container">
                        <table class="employees-table">
                            <thead>
                                <tr>
                                    <th>كود الموظف</th>
                                    <th>اسم الموظف</th>
                                    <th>المسمى الوظيفي</th>
                                    <th>رقم الهاتف</th>
                                    <th>الفرع</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.employees.map(emp => `{
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

function loadEmployeesByBranch() {
    const branch = document.getElementById('branchSelect').value;
    const employeesList = document.getElementById('employeesList');

    if (!branch || branch === '-- اختر الفرع --') {
        employeesList.innerHTML = '<div class="alert">الرجاء اختيار الفرع</div>';
        return;
    }

    employeesList.innerHTML = '<div class="loading">جاري تحميل بيانات الموظفين...</div>';

    // تنظيف أي رسائل سابقة
    const oldMessages = document.querySelectorAll('.success-message, .error-message');
    oldMessages.forEach(msg => msg.remove());

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${encodeURIComponent(branch)}`)
    .then(response => response.json())
    .then(data => {
        console.log('Received data:', data); // للتحقق من البيانات
        employeesList.innerHTML = '';
            
            if (data.employees && data.employees.length > 0) {
                data.employees.forEach(employee => {
                    const employeeCard = document.createElement('div');
                    employeeCard.className = 'employee-attendance-card';
                    employeeCard.innerHTML = `
                        <div class="employee-info">
                            <h3>${employee.name}</h3>
                            <p>${employee.title}</p>
                        </div>
                        <div class="attendance-options">
                            <div class="attendance-option">
                                <input type="radio" id="present_${employee.code}" name="attendance_${employee.code}" value="حضر">
                                <label for="present_${employee.code}">حضر</label>
                            </div>
                            <div class="attendance-option">
                                <input type="radio" id="absent_${employee.code}" name="attendance_${employee.code}" value="غياب">
                                <label for="absent_${employee.code}">غياب</label>
                            </div>
                            <div class="attendance-option">
                                <input type="radio" id="leave_${employee.code}" name="attendance_${employee.code}" value="اجازة">
                                <label for="leave_${employee.code}">اجازة</label>
                            </div>
                            <div class="attendance-option">
                                <input type="radio" id="unauth_leave_${employee.code}" name="attendance_${employee.code}" value="اذن اجازة">
                                <label for="unauth_leave_${employee.code}">إذن اجازة</label>
                            </div>
                        </div>
                    `;
                    container.appendChild(employeeCard);
                });
            } else {
                container.innerHTML = '<div class="no-data">لا يوجد موظفين في هذا الفرع</div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            container.innerHTML = '<div class="error">حدث خطأ في تحميل البيانات</div>';
        });
}

function loadEmployeesForEvaluation() {
    const branch = document.getElementById('evalBranchSelect').value;
    const container = document.getElementById('employeesEvaluationList');
    
    if (!branch) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '<div class="loading">جاري تحميل بيانات الموظفين...</div>';

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

function loadEmployeesForPenalty() {
    const branch = document.getElementById('penaltyBranchSelect').value;
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
            alert('حدث خطأ في تحميل بيانات الموظفين');
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
    loadEmployeesForManagement();
}

function showAttendance() {
    hideAllForms();
    document.getElementById('attendanceForm').style.display = 'block';
    loadEmployeesByBranch();
}

function showEvaluation() {
    hideAllForms();
    document.getElementById('evaluationForm').style.display = 'block';
    loadEmployeesForEvaluation();
    initializeStarRatings();
}

function showPenalty() {
    hideAllForms();
    document.getElementById('penaltyForm').style.display = 'block';
    loadEmployeesForPenalty();
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
                <label>النظافة الشخصية</label>
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
        alert('الرجاء تقييم موظف واحد على الأقل');
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
        if (data.success) {
            alert('تم حفظ التقييمات بنجاح');
            loadEmployeesForEvaluation();
        } else {
            alert('حدث خطأ أثناء حفظ التقييمات');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('حدث خطأ في النظام');
    });
}

// إضافة موظف جديد
document.getElementById('employeeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const employeeData = {
        code: document.getElementById('empCode').value,
        name: document.getElementById('empName').value,
        title: document.getElementById('empTitle').value,
        phone: document.getElementById('empPhone').value,
        branch: document.getElementById('empBranch').value
    };

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'addEmployee',
            data: employeeData
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('تم إضافة الموظف بنجاح');
            document.getElementById('employeeForm').reset();
        } else {
            alert('حدث خطأ أثناء إضافة الموظف');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('حدث خطأ في النظام');
    });
});

// تحميل الموظفين حسب الفرع
function loadEmployeesByBranch() {
    const branch = document.getElementById('branchSelect').value;
    if (!branch) return;

    const employeesList = document.getElementById('employeesList');
    employeesList.innerHTML = '<div class="loading">جاري تحميل البيانات...</div>';

    fetch(`${GOOGLE_SCRIPT_URL}?action=getEmployees&branch=${branch}`)
        .then(response => response.json())
        .then(data => {
            console.log('Received data:', data); // للتحقق من البيانات

            if (!data.success) {
                throw new Error(data.message || 'حدث خطأ في تحميل البيانات');
            }

            if (!data.employees || data.employees.length === 0) {
                employeesList.innerHTML = '<div class="alert">لا يوجد موظفين في هذا الفرع</div>';
                return;
            }

            // إنشاء قائمة الموظفين
            let html = '<div class="employees-grid">';
            data.employees.forEach(employee => {
                const employeeId = employee.code;
                html += `
                    <div class="employee-card" data-employee-id="${employeeId}">
                        <div class="employee-info">
                            <div class="employee-name">${employee.name}</div>
                            <div class="employee-title">${employee.title}</div>
                        </div>
                        <div class="attendance-options">
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="attendance_${employeeId}" value="حضر">
                                    <span>حضر</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="attendance_${employeeId}" value="غياب">
                                    <span>غياب</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="attendance_${employeeId}" value="اجازة">
                                    <span>اجازة</span>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="attendance_${employeeId}" value="اذن اجازة">
                                    <span>إذن اجازة</span>
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
            employeesList.innerHTML = '<div class="error">حدث خطأ في تحميل بيانات الموظفين</div>';
        });
}

// تسجيل الحضور
function createEmployeeAttendanceCard(employee) {
    const card = document.createElement('div');
    card.className = 'employee-attendance-card';
    card.setAttribute('data-employee-id', employee.code);
    
    card.innerHTML = `
        <div class="employee-info">
            <h3>${employee.name}</h3>
            <p>${employee.title}</p>
        </div>
        <div class="attendance-options">
            <div class="attendance-option">
                <input type="radio" id="present_${employee.code}" name="attendance_${employee.code}" value="حضر">
                <label for="present_${employee.code}">حضر</label>
            </div>
            <div class="attendance-option">
                <input type="radio" id="absent_${employee.code}" name="attendance_${employee.code}" value="غياب">
                <label for="absent_${employee.code}">غياب</label>
            </div>
            <div class="attendance-option">
                <input type="radio" id="leave_${employee.code}" name="attendance_${employee.code}" value="اجازة">
                <label for="leave_${employee.code}">اجازة</label>
            </div>
            <div class="attendance-option">
                <input type="radio" id="unauth_leave_${employee.code}" name="attendance_${employee.code}" value="اذن اجازة">
                <label for="unauth_leave_${employee.code}">إذن اجازة</label>
            </div>
        </div>
    `;
    
    return card;
}

function submitAttendance() {
    const attendanceData = [];
    const cards = document.querySelectorAll('.employee-attendance-card');
    
    cards.forEach(card => {
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

    if (attendanceData.length === 0) {
        alert('الرجاء تحديد حالة الحضور لموظف واحد على الأقل');
        return;
    }

    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'recordAttendance',
            data: attendanceData
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('تم تسجيل الحضور بنجاح');
        } else {
            alert('حدث خطأ أثناء تسجيل الحضور');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('حدث خطأ في النظام');
    });
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

    if (!employeeId || !reason || !amount) {
        alert('الرجاء ملء جميع الحقول');
        return;
    }

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
        if (data.success) {
            alert('تم إضافة الجزاء بنجاح');
            document.getElementById('penaltyReason').value = '';
            document.getElementById('penaltyAmount').value = '';
        } else {
            alert('حدث خطأ أثناء إضافة الجزاء');
        }
    })
    .catch(error => {
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
    const toggleButton = document.getElementById('toggleAddEmployeeForm');
    const employeeForm = document.getElementById('employeeForm');
    
    toggleButton.addEventListener('click', function() {
        if (employeeForm.style.display === 'none') {
            employeeForm.style.display = 'block';
            toggleButton.textContent = 'إخفاء نموذج الإضافة';
        } else {
            employeeForm.style.display = 'none';
            toggleButton.textContent = 'إضافة موظف جديد';
        }
    });
});

// تحديث قوائم الموظفين عند تغيير الفرع
document.getElementById('branchSelect').addEventListener('change', loadEmployeesByBranch);
document.getElementById('evalBranchSelect').addEventListener('change', loadEmployeesForEvaluation);
document.getElementById('penaltyBranchSelect').addEventListener('change', loadEmployeesForPenalty);
document.getElementById('empBranchSelect').addEventListener('change', loadEmployeesForManagement);

// وظائف تعديل وحذف الموظفين