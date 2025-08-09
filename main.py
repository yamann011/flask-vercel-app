import os
import json
import hashlib
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, make_response

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "ziyaretci-takip-sistemi-secret-key")

# Veri dizini
DATA_DIR = "data"
USERS_FILE = os.path.join(DATA_DIR, "users.json")
VISITORS_FILE = os.path.join(DATA_DIR, "visitors.json")

# Veri dizinini oluştur
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR, exist_ok=True)

def init_data():
    """Başlangıç verilerini oluştur"""
    # Kullanıcılar dosyası
    if not os.path.exists(USERS_FILE):
        default_users = [
            {
                'id': 1,
                'username': 'erhan',
                'password': hashlib.md5('yaman'.encode()).hexdigest(),
                'first_name': 'ERHAN',
                'last_name': 'YAMAN',
                'is_admin': True,
                'created_at': datetime.now().isoformat()
            }
        ]
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_users, f, ensure_ascii=False, indent=2)
    
    # Ziyaretçiler dosyası
    if not os.path.exists(VISITORS_FILE):
        with open(VISITORS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=2)

def load_users():
    """Kullanıcıları yükle"""
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_users(users):
    """Kullanıcıları kaydet"""
    try:
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

def load_visitors():
    """Ziyaretçileri yükle"""
    try:
        with open(VISITORS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_visitors(visitors):
    """Ziyaretçileri kaydet"""
    try:
        with open(VISITORS_FILE, 'w', encoding='utf-8') as f:
            json.dump(visitors, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

@app.route('/')
def index():
    """Ana sayfa - giriş yapmışsa dashboard'a yönlendir"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Giriş sayfası"""
    error = ''
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        if not username or not password:
            error = 'Kullanıcı adı ve şifre boş bırakılamaz!'
        else:
            users = load_users()
            password_hash = hashlib.md5(password.encode()).hexdigest()
            
            for user in users:
                if user['username'] == username and user['password'] == password_hash:
                    session['user_id'] = user['id']
                    session['username'] = user['username']
                    session['full_name'] = f"{user['first_name']} {user['last_name']}"
                    session['is_admin'] = user['is_admin']
                    return redirect(url_for('dashboard'))
            
            error = 'Kullanıcı adı veya şifre hatalı!'
    
    return render_template('login.html', error=error)

@app.route('/logout')
def logout():
    """Çıkış işlemi"""
    session.clear()
    return jsonify({'success': True, 'redirect': url_for('login')})

@app.route('/dashboard')
def dashboard():
    """Ana panel"""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('dashboard.html')

@app.route('/user_management')
def user_management():
    """Kullanıcı yönetimi"""
    if 'user_id' not in session or not session.get('is_admin'):
        return redirect(url_for('dashboard'))
    
    users = load_users()
    return render_template('user_management.html', users=users)

# API Routes
@app.route('/api/visitors', methods=['GET', 'POST'])
def api_visitors():
    """Ziyaretçi API"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'data': 'Oturum süresi dolmuş'})
    
    if request.method == 'GET':
        action = request.args.get('action', 'list')
        
        if action == 'list':
            visitors = load_visitors()
            users = load_users()
            
            # Kullanıcı bilgilerini ekle
            for visitor in visitors:
                creator = next((u for u in users if u['id'] == visitor['creator_id']), None)
                visitor['creator_name'] = f"{creator['first_name']} {creator['last_name']}" if creator else 'Bilinmiyor'
            
            return jsonify({'success': True, 'data': visitors})
        
        elif action == 'get':
            visitor_id = int(request.args.get('id'))
            visitors = load_visitors()
            visitor = next((v for v in visitors if v['id'] == visitor_id), None)
            
            if visitor:
                # Tarih ve saat bilgilerini ayır
                entry_parts = visitor['entry_datetime'].split(' ')
                visitor['entry_date'] = entry_parts[0]
                visitor['entry_time'] = entry_parts[1]
                
                if visitor.get('exit_datetime'):
                    exit_parts = visitor['exit_datetime'].split(' ')
                    visitor['exit_time'] = exit_parts[1]
                
                return jsonify({'success': True, 'data': visitor})
            else:
                return jsonify({'success': False, 'data': 'Ziyaretçi bulunamadı'})
    
    elif request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'add':
            data = {
                'first_name': request.form.get('firstName', '').strip().upper(),
                'last_name': request.form.get('lastName', '').strip().upper(),
                'company': request.form.get('company', '').strip().upper(),
                'plate': request.form.get('plate', '').strip().upper(),
                'visitor_type': request.form.get('visitorType'),
                'entry_date': request.form.get('entryDate'),
                'entry_time': request.form.get('entryTime'),
                'exit_time': request.form.get('exitTime', ''),
                'creator_id': session['user_id']
            }
            
            if not data['first_name'] or not data['last_name']:
                return jsonify({'success': False, 'data': 'İsim ve soyisim gerekli'})
            
            if not data['entry_date'] or not data['entry_time']:
                return jsonify({'success': False, 'data': 'Giriş tarihi ve saati gerekli'})
            
            visitors = load_visitors()
            new_id = max([v['id'] for v in visitors], default=0) + 1
            
            entry_datetime = f"{data['entry_date']} {data['entry_time']}"
            exit_datetime = f"{data['entry_date']} {data['exit_time']}" if data['exit_time'] else None
            
            new_visitor = {
                'id': new_id,
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'company': data['company'],
                'plate': data['plate'],
                'visitor_type': data['visitor_type'],
                'entry_datetime': entry_datetime,
                'exit_datetime': exit_datetime,
                'creator_id': data['creator_id'],
                'visit_date': data['entry_date'],
                'created_at': datetime.now().isoformat()
            }
            
            visitors.append(new_visitor)
            
            if save_visitors(visitors):
                return jsonify({'success': True, 'data': {'id': new_id, 'message': 'Ziyaretçi başarıyla kaydedildi'}})
            else:
                return jsonify({'success': False, 'data': 'Ziyaretçi kaydedilemedi'})
        
        elif action == 'update':
            visitor_id = int(request.form.get('id'))
            visitors = load_visitors()
            
            visitor = next((v for v in visitors if v['id'] == visitor_id), None)
            if not visitor:
                return jsonify({'success': False, 'data': 'Ziyaretçi bulunamadı'})
            
            if not session.get('is_admin') and visitor['creator_id'] != session['user_id']:
                return jsonify({'success': False, 'data': 'Bu işlem için yetkiniz yok'})
            
            # Güncelle
            visitor['first_name'] = request.form.get('firstName', '').strip().upper()
            visitor['last_name'] = request.form.get('lastName', '').strip().upper()
            visitor['company'] = request.form.get('company', '').strip().upper()
            visitor['plate'] = request.form.get('plate', '').strip().upper()
            visitor['visitor_type'] = request.form.get('visitorType')
            
            entry_date = request.form.get('entryDate')
            entry_time = request.form.get('entryTime')
            exit_time = request.form.get('exitTime', '')
            
            visitor['entry_datetime'] = f"{entry_date} {entry_time}"
            visitor['exit_datetime'] = f"{entry_date} {exit_time}" if exit_time else None
            visitor['visit_date'] = entry_date
            
            if save_visitors(visitors):
                return jsonify({'success': True, 'data': 'Ziyaretçi başarıyla güncellendi'})
            else:
                return jsonify({'success': False, 'data': 'Ziyaretçi güncellenemedi'})
        
        elif action == 'exit':
            visitor_id = int(request.form.get('id'))
            exit_time = request.form.get('exit_time')
            
            visitors = load_visitors()
            visitor = next((v for v in visitors if v['id'] == visitor_id), None)
            
            if not visitor:
                return jsonify({'success': False, 'data': 'Ziyaretçi bulunamadı'})
            
            if not session.get('is_admin') and visitor['creator_id'] != session['user_id']:
                return jsonify({'success': False, 'data': 'Bu işlem için yetkiniz yok'})
            
            visitor['exit_datetime'] = f"{visitor['visit_date']} {exit_time}"
            
            if save_visitors(visitors):
                return jsonify({'success': True, 'data': 'Çıkış başarıyla kaydedildi'})
            else:
                return jsonify({'success': False, 'data': 'Çıkış kaydedilemedi'})
        
        elif action == 'delete':
            visitor_id = int(request.form.get('id'))
            visitors = load_visitors()
            
            visitor = next((v for v in visitors if v['id'] == visitor_id), None)
            if not visitor:
                return jsonify({'success': False, 'data': 'Ziyaretçi bulunamadı'})
            
            if not session.get('is_admin') and visitor['creator_id'] != session['user_id']:
                return jsonify({'success': False, 'data': 'Bu işlem için yetkiniz yok'})
            
            visitors = [v for v in visitors if v['id'] != visitor_id]
            
            if save_visitors(visitors):
                return jsonify({'success': True, 'data': 'Ziyaretçi başarıyla silindi'})
            else:
                return jsonify({'success': False, 'data': 'Ziyaretçi silinemedi'})

@app.route('/api/users', methods=['GET', 'POST'])
def api_users():
    """Kullanıcı API"""
    if 'user_id' not in session or not session.get('is_admin'):
        return jsonify({'success': False, 'data': 'Bu işlem için admin yetkisi gerekli'})
    
    if request.method == 'GET':
        action = request.args.get('action', 'list')
        
        if action == 'list':
            users = load_users()
            return jsonify({'success': True, 'data': users})
        
        elif action == 'get':
            user_id = int(request.args.get('id'))
            users = load_users()
            user = next((u for u in users if u['id'] == user_id), None)
            
            if user:
                # Şifreyi göndermiyoruz
                user_copy = user.copy()
                del user_copy['password']
                return jsonify({'success': True, 'data': user_copy})
            else:
                return jsonify({'success': False, 'data': 'Kullanıcı bulunamadı'})
    
    elif request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'add':
            data = {
                'username': request.form.get('username', '').strip(),
                'password': request.form.get('password', '').strip(),
                'first_name': request.form.get('firstName', '').strip().upper(),
                'last_name': request.form.get('lastName', '').strip().upper(),
                'is_admin': 'isAdmin' in request.form
            }
            
            if not all([data['username'], data['password'], data['first_name'], data['last_name']]):
                return jsonify({'success': False, 'data': 'Tüm alanlar gerekli'})
            
            users = load_users()
            
            # Kullanıcı adı kontrolü
            if any(u['username'] == data['username'] for u in users):
                return jsonify({'success': False, 'data': 'Bu kullanıcı adı zaten kullanılıyor'})
            
            new_id = max([u['id'] for u in users], default=0) + 1
            
            new_user = {
                'id': new_id,
                'username': data['username'],
                'password': hashlib.md5(data['password'].encode()).hexdigest(),
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'is_admin': data['is_admin'],
                'created_at': datetime.now().isoformat()
            }
            
            users.append(new_user)
            
            if save_users(users):
                return jsonify({'success': True, 'data': 'Kullanıcı başarıyla eklendi'})
            else:
                return jsonify({'success': False, 'data': 'Kullanıcı eklenemedi'})
        
        elif action == 'update':
            user_id = int(request.form.get('id'))
            users = load_users()
            
            user = next((u for u in users if u['id'] == user_id), None)
            if not user:
                return jsonify({'success': False, 'data': 'Kullanıcı bulunamadı'})
            
            data = {
                'username': request.form.get('username', '').strip(),
                'first_name': request.form.get('firstName', '').strip().upper(),
                'last_name': request.form.get('lastName', '').strip().upper(),
                'is_admin': 'isAdmin' in request.form
            }
            
            password = request.form.get('password', '').strip()
            
            if not all([data['username'], data['first_name'], data['last_name']]):
                return jsonify({'success': False, 'data': 'Kullanıcı adı, isim ve soyisim gerekli'})
            
            # Kullanıcı adı kontrolü (kendisi hariç)
            if any(u['username'] == data['username'] and u['id'] != user_id for u in users):
                return jsonify({'success': False, 'data': 'Bu kullanıcı adı zaten kullanılıyor'})
            
            # Güncelle
            user['username'] = data['username']
            if password:
                user['password'] = hashlib.md5(password.encode()).hexdigest()
            user['first_name'] = data['first_name']
            user['last_name'] = data['last_name']
            user['is_admin'] = data['is_admin']
            
            if save_users(users):
                return jsonify({'success': True, 'data': 'Kullanıcı başarıyla güncellendi'})
            else:
                return jsonify({'success': False, 'data': 'Kullanıcı güncellenemedi'})
        
        elif action == 'delete':
            user_id = int(request.form.get('id'))
            
            # Kendi hesabını silemesin
            if user_id == session['user_id']:
                return jsonify({'success': False, 'data': 'Kendi hesabınızı silemezsiniz'})
            
            users = load_users()
            users = [u for u in users if u['id'] != user_id]
            
            if save_users(users):
                return jsonify({'success': True, 'data': 'Kullanıcı başarıyla silindi'})
            else:
                return jsonify({'success': False, 'data': 'Kullanıcı silinemedi'})

@app.route('/api/stats')
def api_stats():
    """İstatistik API"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'data': 'Oturum süresi dolmuş'})
    
    visitors = load_visitors()
    today = datetime.now().strftime('%Y-%m-%d')
    this_month = datetime.now().strftime('%Y-%m')
    
    daily_count = len([v for v in visitors if v['visit_date'] == today])
    monthly_count = len([v for v in visitors if v['visit_date'].startswith(this_month)])
    total_count = len(visitors)
    active_count = len([v for v in visitors if not v.get('exit_datetime')])
    
    stats = {
        'daily': daily_count,
        'monthly': monthly_count,
        'total': total_count,
        'active': active_count
    }
    
    return jsonify({'success': True, 'data': stats})

if __name__ == '__main__':
    init_data()
    app.run(host='0.0.0.0', port=5000, debug=True)