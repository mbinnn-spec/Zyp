# Zyp

Aplikasi pengunduh media sosial yang cepat, ringan, dan mudah digunakan untuk Android dan Web. Zyp memungkinkan Anda mengunduh video, audio, dan foto berkualitas tinggi tanpa watermark dari berbagai platform populer.

---

## Fitur Utama & Platform

- **TikTok**: Unduh video HD tanpa watermark, audio MP3, dan slide foto.
- **Instagram**: Unduh Reels, video feed, dan postingan multi-foto (carousel).
- **Pinterest**: Unduh Video Pin MP4 kualitas HD 720p, Foto Pin resolusi asli (*Ultra HD Originals*), dan gambar sampul (*cover*).
- **Facebook**: Unduh video feed, Facebook Reels, dan Facebook Watch (kualitas HD/SD) serta audio MP3.
- **YouTube**: Unduh video reguler dan YouTube Shorts dalam kualitas HD.
- **Twitter / X**: Unduh video HD dan foto resolusi asli.
- **Spotify**: Unduh audio musik dari tautan lagu Spotify.
- **Threads**: Unduh foto, video, dan media postingan Threads.
- **Bilibili (Bstation)**: Unduh video anime / kreator dan soundtrack audio bawaan.
- **Unduh Sekaligus (Multi-Link Batch)**: Masukkan 2 hingga 10 tautan sekaligus untuk diunduh secara berurutan dan otomatis.
- **Kunci Privasi Galeri (Vault)**: Amankan file unduhan dengan proteksi PIN 4-digit yang otomatis terkunci saat aplikasi diminimalkan.
- **Deteksi Otomatis Clipboard**: Deteksi instan saat tautan media disalin ke clipboard dengan banner konfirmasi cepat.
- **Pemutar Media Bawaan**: Pratinjau video dan audio langsung di dalam aplikasi sebelum mengunduh.
- **Personalisasi Tema**: Pilihan tema AMOLED Black, Dark Obsidian, dan Clean Light dengan berbagai warna aksen modern.
- **Simpan Otomatis ke Galeri**: Terintegrasi langsung dengan Android DownloadManager untuk penyimpanan aman di penyimpanan lokal.

Untuk riwayat lengkap pembaruan setiap versi, silakan lihat [CHANGELOG.md](CHANGELOG.md).

---

## Teknologi

- **Frontend**: HTML, CSS, JavaScript (Vanilla ES Modules)
- **Build Tool**: Vite
- **Mobile Framework**: Capacitor 6 (Android)

---

## Cara Menjalankan

### Persyaratan
- Node.js (versi 18 atau lebih baru)
- Android Studio (opsional, jika ingin membuat build APK atau menjalankan di HP)

### 1. Salin Repository dan Pasang Dependensi
```bash
git clone https://github.com/mbinnn-spec/Zyp.git
cd Zyp
npm install
```

### 2. Jalankan Mode Web (Development)
```bash
npm run dev
```

### 3. Build Aplikasi Android
```bash
# Build file web produksi
npm run build

# Salin aset web ke folder Android
npx cap copy

# Buka proyek di Android Studio
npx cap open android
```

---

## Struktur Folder

```text
├── android/          Proyek native Android (Capacitor)
├── src/
│   ├── css/          File styling CSS
│   ├── js/           Logika aplikasi dan fungsi ekstraktor tautan
│   └── icons/        Aset ikon aplikasi
├── index.html        Halaman utama aplikasi
├── capacitor.config.json  Konfigurasi Capacitor Android
└── package.json      Daftar dependensi dan skrip proyek
```

---

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).
