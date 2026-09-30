# LoadLab

LoadLab adalah aplikasi web untuk menjalankan tes beban HTTP sederhana terhadap endpoint yang kamu miliki atau berwenang untuk uji. Aplikasi terdiri dari dashboard React untuk mengatur tes dan server Node.js yang mengirim request ke target. Pengiriman dilakukan dari server, bukan dari browser, sehingga request tidak bergantung pada CORS di browser.

LoadLab ditujukan untuk pengujian terkontrol dan penggunaan lokal. Ini bukan pengganti platform performance testing berskala besar, dan bukan alat untuk menguji target tanpa izin.

## Cara Kerja

1. Masukkan URL target berprotokol `http` atau `https`.
2. Tentukan jumlah request, jumlah request yang berjalan bersamaan, dan timeout.
3. Jalankan tes. Server mengirim request `GET` ke target dan menampilkan hasil setiap request.

Hasil menunjukkan status HTTP, alasan/status pesan, dan latency tiap request. Ringkasan menampilkan jumlah request, jumlah sukses/gagal, total latency, dan rata-rata latency.

## Metrik

- **Sukses:** respons HTTP dengan status `2xx`.
- **Gagal:** status HTTP di luar `2xx`, timeout, atau kegagalan jaringan.
- **Latency:** waktu dari server mulai mengirim request sampai seluruh respons target selesai diterima. Isi response dibuang dan tidak disimpan.
- **Rata-rata latency:** rata-rata latency seluruh request, termasuk request yang gagal.

LoadLab tidak mengukur CPU atau RAM mesin target. Request saat ini hanya menggunakan metode `GET`; custom header, request body, dan metode lain belum didukung.

## Menjalankan Secara Lokal

### Kebutuhan

- Node.js 20 atau lebih baru

Di PowerShell, dari folder proyek:

```powershell
npm install
npm run dev
```

Buka alamat lokal yang ditampilkan Vite, biasanya `http://localhost:5173`. Jika port itu sedang dipakai, Vite otomatis memilih port berikutnya. Backend berjalan di port `3001` dan hanya menerima koneksi lokal. Tidak perlu API key untuk development.

## Batas dan Keamanan

- Satu tes dibatasi maksimal 1.000 request, 50 request bersamaan, dan timeout 30 detik per request.
- API membatasi lima pengajuan tes per alamat IP setiap menit.
- Target harus berupa URL HTTP(S) yang resolve ke alamat IP publik. Alamat loopback, jaringan privat, dan link-local ditolak.
- Redirect diikuti maksimal lima kali; setiap tujuan redirect diperiksa kembali.
- Gunakan hanya pada sistem yang kamu miliki atau memiliki izin untuk diuji. Mulai dari jumlah request dan konkurensi kecil.
- Mode lokal terikat ke `127.0.0.1`; jangan mengekspos server development langsung ke internet.

## Penggunaan Produksi

Mode produksi bukan untuk dibuka tanpa autentikasi. Server mewajibkan Cloudflare Access dan memvalidasi JWT pada setiap pengajuan tes. Untuk menyiapkannya, lindungi hostname dengan kebijakan Cloudflare Access dan isi variabel berikut melalui environment/secret manager:

- `NODE_ENV=production`
- `CF_ACCESS_ISSUER`: URL issuer HTTPS dari tim Cloudflare Access.
- `CF_ACCESS_AUD`: audience tag aplikasi Cloudflare Access.
- `PORT`: port server (opsional, default `3000`).
- `TRUST_PROXY_HOPS`: jumlah proxy tepercaya di depan server (opsional, default `0`).

Build frontend dan jalankan server:

```powershell
npm ci
npm run build
$env:NODE_ENV = "production"
$env:CF_ACCESS_ISSUER = "https://your-team.cloudflareaccess.com"
$env:CF_ACCESS_AUD = "your-cloudflare-access-application-aud-tag"
$env:PORT = "3000"
npm start
```

Server menyajikan folder `dist` dan API dari origin yang sama. Pertahankan origin di belakang Cloudflare Access/HTTPS. Health check tersedia di `/api/health`. Untuk beberapa instance, rate limit perlu dipindahkan ke storage bersama agar konsisten di semua instance.

## Pemeriksaan

```sh
npm test
npm run lint
npm run build
```
