# Zyp

Aplikasi pengunduh media sosial yang cepat, ringan, dan mudah digunakan untuk Android dan Web. Zyp memungkinkan Anda mengunduh video, audio, dan foto berkualitas tinggi tanpa watermark dari berbagai platform populer.

---

## Fitur

- **TikTok**: Unduh video HD tanpa watermark, audio MP3, dan slide foto.
- **Instagram**: Unduh Reels, video feed, dan postingan multi-foto (carousel).
- **YouTube**: Unduh video reguler dan YouTube Shorts dalam kualitas HD.
- **Twitter / X**: Unduh video HD dan foto resolusi asli.
- **Unduh Sekaligus (Multi-Link)**: Masukkan beberapa tautan sekaligus untuk diunduh secara berurutan.
- **Deteksi Otomatis**: Mendeteksi tautan yang disalin ke clipboard secara instan saat membuka aplikasi.
- **Pemutar Media Bawaan**: Putar video atau dengarkan audio langsung di dalam aplikasi sebelum mengunduh.
- **Pilihan Tema**: Mendukung tema AMOLED, Gelap (Dark), dan Terang (Light).
- **Simpan ke Galeri**: Hasil unduhan otomatis tersimpan di penyimpanan perangkat dan muncul di galeri.

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
