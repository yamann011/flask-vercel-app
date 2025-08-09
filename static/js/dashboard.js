// Dashboard JavaScript Functions
let visitors = [];
let stats = {};

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    loadStats();
    loadVisitors();
    initSearch();
    initAutoRefresh();
    setCurrentDateTime();
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
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

// Statistics Functions
function loadStats() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                stats = data.data;
                updateStatsDisplay();
            } else {
                showAlert('danger', 'İstatistikler yüklenemedi: ' + data.data);
            }
        })
        .catch(error => {
            console.error('Stats error:', error);
            showAlert('danger', 'İstatistikler yüklenirken hata oluştu');
        });
}

function updateStatsDisplay() {
    document.getElementById('dailyCount').textContent = stats.daily || 0;
    document.getElementById('monthlyCount').textContent = stats.monthly || 0;
    document.getElementById('totalCount').textContent = stats.total || 0;
    document.getElementById('activeCount').textContent = stats.active || 0;
}

// Visitors Functions
function loadVisitors() {
    fetch('/api/visitors?action=list')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                visitors = data.data;
                displayVisitors(visitors);
            } else {
                showAlert('danger', 'Ziyaretçiler yüklenemedi: ' + data.data);
            }
        })
        .catch(error => {
            console.error('Visitors error:', error);
            showAlert('danger', 'Ziyaretçiler yüklenirken hata oluştu');
        });
}

function displayVisitors(visitorsToShow) {
    const tbody = document.getElementById('visitorsTable');
    
    if (visitorsToShow.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted">
                    <i class="fas fa-info-circle"></i> Henüz ziyaretçi kaydı bulunmuyor
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = visitorsToShow.map(visitor => `
        <tr>
            <td>${visitor.id}</td>
            <td>${visitor.first_name}</td>
            <td>${visitor.last_name}</td>
            <td>${visitor.company || '-'}</td>
            <td>${visitor.plate || '-'}</td>
            <td>${getVisitorTypeText(visitor.visitor_type)}</td>
            <td>${formatDateTime(visitor.entry_datetime)}</td>
            <td>${visitor.exit_datetime ? formatDateTime(visitor.exit_datetime) : 
                 '<span class="badge bg-warning">Aktif</span>'}</td>
            <td>${visitor.creator_name}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary btn-action" onclick="editVisitor(${visitor.id})" 
                            title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!visitor.exit_datetime ? `
                        <button class="btn btn-outline-warning btn-action" onclick="exitVisitor(${visitor.id})" 
                                title="Çıkış Kaydet">
                            <i class="fas fa-sign-out-alt"></i>
                        </button>
                    ` : ''}
                    <button class="btn btn-outline-danger btn-action" onclick="deleteVisitor(${visitor.id})" 
                            title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getVisitorTypeText(type) {
    const types = {
        'misafir': 'Misafir',
        'personel': 'Personel',
        'tedarikci': 'Tedarikçi',
        'kurier': 'Kurier',
        'diger': 'Diğer'
    };
    return types[type] || type;
}

function formatDateTime(datetime) {
    if (!datetime) return '-';
    const [date, time] = datetime.split(' ');
    return `${date}<br><small class="text-muted">${time}</small>`;
}

// Modal Functions
function showAddModal() {
    document.getElementById('modalTitle').textContent = 'Ziyaretçi Ekle';
    document.getElementById('formAction').value = 'add';
    document.getElementById('visitorForm').reset();
    document.getElementById('visitorId').value = '';
    setCurrentDateTime();
    
    const modal = new bootstrap.Modal(document.getElementById('visitorModal'));
    modal.show();
}

function editVisitor(id) {
    fetch(`/api/visitors?action=get&id=${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const visitor = data.data;
                
                document.getElementById('modalTitle').textContent = 'Ziyaretçi Düzenle';
                document.getElementById('formAction').value = 'update';
                document.getElementById('visitorId').value = visitor.id;
                document.getElementById('firstName').value = visitor.first_name;
                document.getElementById('lastName').value = visitor.last_name;
                document.getElementById('company').value = visitor.company || '';
                document.getElementById('plate').value = visitor.plate || '';
                document.getElementById('visitorType').value = visitor.visitor_type;
                document.getElementById('entryDate').value = visitor.entry_date;
                document.getElementById('entryTime').value = visitor.entry_time;
                document.getElementById('exitTime').value = visitor.exit_time || '';
                
                const modal = new bootstrap.Modal(document.getElementById('visitorModal'));
                modal.show();
            } else {
                showAlert('danger', 'Ziyaretçi bilgileri alınamadı: ' + data.data);
            }
        })
        .catch(error => {
            console.error('Edit error:', error);
            showAlert('danger', 'Ziyaretçi bilgileri alınırken hata oluştu');
        });
}

function exitVisitor(id) {
    const visitor = visitors.find(v => v.id === id);
    if (!visitor) return;
    
    document.getElementById('exitVisitorId').value = id;
    document.getElementById('exitVisitorName').textContent = `${visitor.first_name} ${visitor.last_name}`;
    
    // Set current time
    const now = new Date();
    const timeString = now.toTimeString().substr(0, 5);
    document.getElementById('exitTimeInput').value = timeString;
    
    const modal = new bootstrap.Modal(document.getElementById('exitModal'));
    modal.show();
}

function deleteVisitor(id) {
    const visitor = visitors.find(v => v.id === id);
    if (!visitor) return;
    
    if (confirm(`${visitor.first_name} ${visitor.last_name} adlı ziyaretçiyi silmek istediğinizden emin misiniz?`)) {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);
        
        fetch('/api/visitors', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', data.data);
                refreshData();
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

// Form Handlers
document.getElementById('visitorForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    fetch('/api/visitors', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.data.message || data.data);
            bootstrap.Modal.getInstance(document.getElementById('visitorModal')).hide();
            refreshData();
        } else {
            showAlert('danger', data.data);
        }
    })
    .catch(error => {
        console.error('Form error:', error);
        showAlert('danger', 'İşlem sırasında hata oluştu');
    });
});

document.getElementById('exitForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    fetch('/api/visitors', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.data);
            bootstrap.Modal.getInstance(document.getElementById('exitModal')).hide();
            refreshData();
        } else {
            showAlert('danger', data.data);
        }
    })
    .catch(error => {
        console.error('Exit error:', error);
        showAlert('danger', 'Çıkış kaydı sırasında hata oluştu');
    });
});

// Search Functionality
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = this.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                displayVisitors(visitors);
            } else {
                const filtered = visitors.filter(visitor => 
                    visitor.first_name.toLowerCase().includes(searchTerm) ||
                    visitor.last_name.toLowerCase().includes(searchTerm) ||
                    (visitor.plate && visitor.plate.toLowerCase().includes(searchTerm))
                );
                displayVisitors(filtered);
            }
        }, 300);
    });
}

// Utility Functions
function setCurrentDateTime() {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const timeString = now.toTimeString().substr(0, 5);
    
    document.getElementById('entryDate').value = dateString;
    document.getElementById('entryTime').value = timeString;
}

function refreshData() {
    loadStats();
    loadVisitors();
}

function initAutoRefresh() {
    // Auto refresh every 30 seconds
    setInterval(refreshData, 30000);
}

function exportData() {
    if (visitors.length === 0) {
        showAlert('warning', 'Dışa aktarılacak veri bulunmuyor');
        return;
    }
    
    // Create CSV content
    const headers = ['ID', 'İsim', 'Soyisim', 'Şirket', 'Plaka', 'Tür', 'Giriş', 'Çıkış', 'Kaydeden'];
    const csvContent = [
        headers.join(','),
        ...visitors.map(visitor => [
            visitor.id,
            visitor.first_name,
            visitor.last_name,
            visitor.company || '',
            visitor.plate || '',
            getVisitorTypeText(visitor.visitor_type),
            visitor.entry_datetime,
            visitor.exit_datetime || '',
            visitor.creator_name
        ].join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ziyaretci_listesi_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('success', 'Excel dosyası başarıyla indirildi');
}

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

// Logout Function
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