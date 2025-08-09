# Ziyaretçi Takip Sistemi - Flask Versiyonu

## 🚀 Hızlı Başlangıç

### Yerel Kurulum
```bash
# Bağımlılıkları yükle
pip install -r requirements.txt

# Uygulamayı başlat
python main.py
```

### Vercel Dağıtımı
1. Repository'yi GitHub'a push edin
2. Vercel'e import edin
3. Environment variables ekleyin:
   - `SESSION_SECRET=your-secret-key`

## 📁 Dosya Yapısı
```
flask_version/
├── main.py              # Ana Flask uygulaması
├── requirements.txt     # Python bağımlılıkları
├── vercel.json         # Vercel yapılandırması
├── templates/          # HTML şablonları
│   ├── base.html
│   ├── login.html
│   ├── dashboard.html
│   └── user_management.html
└── static/             # CSS, JS dosyaları
    ├── css/
    └── js/
```

## ⚡ Özellikler
- ✅ Session tabanlı kimlik doğrulama
- ✅ JSON veri depolama
- ✅ Responsive tasarım
- ✅ Tema sistemi (açık/koyu)
- ✅ Excel export
- ✅ AJAX tabanlı işlemler

## 🔧 Yapılandırma
- **Varsayılan Admin:** erhan / yaman
- **Port:** 5000
- **Debug Mode:** Aktif (geliştirme için)

## 📊 API Endpoints
- `GET /` - Ana sayfa
- `POST /login` - Giriş
- `GET /logout` - Çıkış
- `GET /dashboard` - Ana panel
- `GET /user_management` - Kullanıcı yönetimi
- `POST /api/visitors` - Ziyaretçi işlemleri
- `POST /api/users` - Kullanıcı işlemleri
- `GET /api/stats` - İstatistikler