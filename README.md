# ⚡ Zyp — Universal Media & Video Downloader

<p align="center">
  <img src="src/icons/icon-512.png" width="96" height="96" alt="Zyp Logo" style="border-radius: 20px;">
</p>

<p align="center">
  <b>Aplikasi pengunduh media sosial modern, cepat, dan tanpa watermark untuk Android & Web.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20Web-blue?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Stack-Vite%20%7C%20Capacitor-purple?style=flat-square" alt="Stack">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## ✨ Fitur Utama

- **🎥 TikTok Downloader**: Unduh video HD (1080p) tanpa watermark, audio musik MP3, serta foto slide secara otomatis.
- **📸 Instagram Downloader**: Dukungan penuh untuk Reels HD, Carousel (multi-slide foto/video), Feed, dan Stories.
- **☁️ Private Cloud / TeraBox Support**: Ekstraksi langsung link unduhan file cloud.
- **📦 Multi-Link / Batch Mode**: Tempel banyak tautan sekaligus dan unduh secara berurutan dengan progress bar antrean.
- **📋 Smart Clipboard Auto-Detect**: Mendeteksi otomatis tautan yang disalin saat membuka aplikasi.
- **🔒 Private Vault (Galeri Rahasia)**: Simpan dan kunci media pribadi kamu dengan proteksi PIN.
- **🎬 Built-in Player**: Putar video dan dengarkan audio langsung di dalam aplikasi sebelum mengunduh.
- **🎨 Personalisasi UI Elegan**: Mode AMOLED murni, Dark, Light, serta pilihan aksen warna dinamis.
- **📱 Native Android Ready**: Berjalan responsif di mobile dan file otomatis masuk ke galeri perangkat.

---

## 🛠️ Tech Stack

- **Frontend Core**: HTML5, Vanilla CSS3 (Custom Design System), JavaScript (ES Modules)
- **Bundler / Build Tool**: [Vite](https://vitejs.dev/)
- **Mobile Engine**: [Capacitor 6](https://capacitorjs.com/) (Filesystem, Clipboard, Status Bar, App)

---

## 🚀 Cara Menjalankan & Membangun Proyek

### 1. Clone Repository
```bash
git clone https://github.com/username-kamu/zyp.git
cd zyp
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Jalankan Mode Web (Development)
```bash
npm run dev
```

### 4. Build untuk Android (Capacitor)
```bash
# Build bundle produksi web
npm run build

# Sinkronisasi aset ke folder Android
npx cap sync

# Buka Android Studio
npx cap open android
```

---

## 📂 Struktur Proyek

```text
├── android/               # Native Android project (Capacitor)
├── src/
│   ├── css/               # Styling & design system tokens
│   ├── js/
│   │   ├── app.js         # Core application logic & UI controllers
│   │   └── extractors.js  # Media extraction engines
│   └── icons/             # App icons & assets
├── index.html             # Main entrypoint
├── capacitor.config.json  # Capacitor native configuration
├── vite.config.js         # Vite configuration & dev proxies
└── package.json           # Project dependencies & scripts
```

---

## 📄 Lisensi
Didistribusikan di bawah lisensi [MIT](LICENSE). Bebas digunakan dan dikembangkan untuk keperluan non-komersial dan edukasi.
