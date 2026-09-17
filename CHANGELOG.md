# Changelog

Semua perubahan penting pada proyek **Zyp** akan didokumentasikan dalam berkas ini.

Format berkas ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mengikuti [Semantic Versioning](https://semver.org/lang/id/).

---

## [1.2.0] - 2026-09-17

### Ditambahkan
- **Pinterest Downloader**:
  - Dukungan unduh video Pinterest dalam format MP4 resolusi tinggi (HD 720p).
  - Dukungan unduh foto Pin dalam resolusi asli tanpa kompresi (*Ultra HD / Originals*).
  - Pilihan unduh foto resolusi standar (*HD 736p*) yang lebih hemat penyimpanan.
  - Ekstraksi gambar sampul (*poster/thumbnail*) dari video pin.
  - Deteksi otomatis link pendek `pin.it/...`, `pinterest.com/pin/...`, dan subdomain regional (`id.pinterest.com`).
  - Pembersihan otomatis parameter pelacak (*tracking query*) seperti `invite_code`, `sender`, dan `sfo`.
  - Sistem *dual-engine* dengan fallback web scraper jika API primer sibuk.
- **Facebook Downloader**:
  - Dukungan unduh Facebook Video Feed, Facebook Reels, dan Facebook Watch.
  - Pilihan kualitas video HD 720p dan SD 360p.
  - Ekstraksi audio MP3 dari video Facebook.
  - Dukungan tautan `facebook.com`, `fb.watch`, dan `fb.com`.
- **Integrasi Batch Mode**:
  - Pinterest dan Facebook kini didukung penuh di antrean unduh sekaligus (*Multi-Link Batch Downloader*).

### Diubah & Ditingkatkan
- **Pembersihan Antarmuka (UI)**:
  - Menghapus badge dan UI Apple Music dari daftar platform yang didukung.
  - Mengganti gaya penulisan teks dari huruf kapital penuh (*ALL CAPS*) menjadi **Title Case** yang tebal (*bold*) agar lebih elegan, nyaman dibaca, dan modern.
  - Memperbarui placeholder input untuk mencantumkan tautan `pin.it` dan `facebook.com`.
  - Memperbarui panduan aplikasi di modal bantuan dengan daftar platform terlengkap.
- **Performa & Keandalan**:
  - Optimalisasi *safe HTTP client* dengan dukungan proxy lokal untuk pengujian web dan bypass CORS native pada Android.

---

## [1.1.0] - 2026-09-16

### Ditambahkan
- **Threads Downloader**:
  - Ekstraksi foto dan video dari postingan Threads (`threads.net`).
  - Resolusi otomatis tautan pendek dan tautan bagikan mobile.
- **Bilibili / Bstation Downloader**:
  - Dukungan unduh video anime dan kreator Bilibili/Bstation (`bilibili.com`, `bilibili.tv`, `b23.tv`).
  - Ekstraksi soundtrack audio MP3 bawaan.
- **Spotify Downloader**:
  - Dukungan pengunduhan audio musik dari link Spotify.
- **Kunci Privasi Galeri (Vault)**:
  - Proteksi PIN 4-digit untuk mengunci riwayat unduhan galeri.
  - Penguncian otomatis saat aplikasi diminimalkan atau ditutup.

---

## [1.0.0] - 2026-09-10

### Ditambahkan
- Rilis perdana **Zyp** (Android & Web).
- **Platform yang Didukung**:
  - **TikTok**: Unduh video HD tanpa watermark, audio MP3, dan slide foto.
  - **Instagram**: Unduh Reels, video feed, dan postingan carousel foto.
  - **YouTube**: Unduh video reguler dan YouTube Shorts kualitas HD.
  - **Twitter / X**: Unduh video MP4 dan gambar resolusi tinggi.
- **Fitur Utama**:
  - Mode **Unduh Tunggal** & **Multi-Link (Batch)** hingga 10 tautan sekaligus.
  - Deteksi otomatis clipboard saat membuka aplikasi.
  - Pemutar video dan audio bawaan (*inline player*).
  - Personalisasi tema: **AMOLED Black**, **Dark Obsidian**, dan **Clean Light** beserta pilihan warna aksen.
  - Integrasi native Android DownloadManager untuk penyimpanan otomatis ke galeri.
