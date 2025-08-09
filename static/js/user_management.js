// User Management JavaScript Functions
let users = [];

// Initialize page when loaded
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    loadUsers();
});

// Theme Management (shared with dashboard)
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// User Management Functions
function loadUsers() {
    fetch('/api/users?action=list')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                users = data.data;
                displayUsers();
            } else {
                showAlert('danger', 'Kullanıcılar yüklenemedi: ' + data.data);
            }
        })
        .catch(error => {
            console.error('Users error:', error);
            showAlert('danger', 'Kullanıcılar yüklenirken hata oluştu');
        });
}

function displayUsers() {
    const tbody = document.getElementById('usersTable');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-info-circle"></i> Henüz kullanıcı kaydı bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.first_name}</td>
            <td>${user.last_name}</td>
            <td>
                ${user.is_admin ? 
                    '<span class="badge bg-warning"><i class="fas fa-crown"></i> Admin</span>' : 
                    '<span class="badge bg-secondary">Kullanıcı</span>'
                }
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary btn-action" onclick="editUser(${user.id})" 
                            title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-action" onclick="deleteUser(${user.id})" 
                            title="Sil" ${user.id === 1 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR') + '<br><small class="text-muted">' + 
           date.toLocaleTimeString('tr-TR') + '</small>';
}

// Modal Functions
function showAddUserModal() {
    document.getElementById('userModalTitle').textContent = 'Kullanıcı Ekle';
    document.getElementById('userFormAction').value = 'add';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    
    // Show password as required for new users
    document.getElementById('passwordRequired').textContent = '*';
    document.getElementById('password').required = true;
    document.getElementById('passwordHelp').style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

function editUser(id) {
    fetch(`/api/users?action=get&id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const user = data.data;
                
                document.getElementById('userModalTitle').textContent = 'Kullanıcı Düzenle';
                document.getElementById('userFormAction').value = 'update';
                document.getElementById('userId').value = user.id;
                document.getElementById('username').value = user.username;
                document.getElementById('password').value = '';
                document.getElementById('userFirstName').value = user.first_name;
                document.getElementById('userLastName').value = user.last_name;
                document.getElementById('isAdmin').checked = user.is_admin;
                
                // Password not required for updates
                document.getElementById('passwordRequired').textContent = '';
                document.getElementById('password').required = false;
                document.getElementById('passwordHelp').style.display = 'block';
                
                const modal = new bootstrap.Modal(document.getElementById('userModal'));
                modal.show();
            } else {
                showAlert('danger', 'Kullanıcı bilgileri alınamadı: ' + data.data);
            }
        })
        .catch(error => {
            console.error('Edit error:', error);
            showAlert('danger', 'Kullanıcı bilgileri alınırken hata oluştu');
        });
}

function deleteUser(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    if (user.id === 1) {
        showAlert('warning', 'Ana admin kullanıcısını silemezsiniz');
        return;
    }
    
    if (confirm(`${user.first_name} ${user.last_name} (${user.username}) adlı kullanıcıyı silmek istediğinizden emin misiniz?`)) {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);
        
        fetch('/api/users', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', data.data);
                loadUsers();
            } else {
                showAlert('danger', data.data);
            }
        })
        .catch(error => {
            console.error('Delete error:', error);
            showAlert('danger', 'Silme işlemi sırasında hata oluştu');
        });
    }
}

// Form Handler
document.getElementById('userForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    // Validate required fields
    const username = formData.get('username').trim();
    const firstName = formData.get('firstName').trim();
    const lastName = formData.get('lastName').trim();
    const password = formData.get('password').trim();
    const isNewUser = formData.get('action') === 'add';
    
    if (!username || !firstName || !lastName) {
        showAlert('danger', 'Kullanıcı adı, isim ve soyisim gerekli');
        return;
    }
    
    if (isNewUser && !password) {
        showAlert('danger', 'Yeni kullanıcı için şifre gerekli');
        return;
    }
    
    fetch('/api/users', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.data);
            bootstrap.Modal.getInstance(document.getElementById('userModal')).hide();
            loadUsers();
        } else {
            showAlert('danger', data.data);
        }
    })
    .catch(error => {
        console.error('Form error:', error);
        showAlert('danger', 'İşlem sırasında hata oluştu');
    });
});

// Utility Functions
function showAlert(type, message) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert-dismissible');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'danger' ? 'exclamation-triangle' : 
                              type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const container = document.querySelector('.container');
    container.insertAdjacentHTML('afterbegin', alertHtml);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const alert = document.querySelector('.alert-dismissible');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Logout Function (shared)
function logout() {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
        fetch('/logout')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect;
                } else {
                    showAlert('danger', 'Çıkış işlemi başarısız');
                }
            })
            .catch(error => {
                console.error('Logout error:', error);
                showAlert('danger', 'Çıkış işlemi sırasında hata oluştu');
            });
    }
}