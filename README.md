# SI-PROFIL — Panduan Deploy (untuk yang bukan developer)

Aplikasi ini sudah lengkap kodenya. Anda tidak perlu menulis kode apapun — cukup ikuti langkah di bawah untuk membuatnya "hidup" di internet.

## Yang sudah disiapkan otomatis
- Database Supabase (project `si-profil-lpb`) — sudah ada isinya (241 UMKM, dst)
- Kredensial Supabase sudah tertulis di file `.env.local.example`

## Langkah 1 — Upload kode ke GitHub
1. Buka [github.com](https://github.com), buat akun kalau belum punya (gratis)
2. Klik tombol hijau **"New"** untuk bikin repository baru
3. Beri nama, misal `si-profil-lpb`, pilih **Private**, klik **Create repository**
4. Di halaman repo kosong itu, klik **"uploading an existing file"**
5. Drag & drop **semua isi folder ini** (semua file dan folder: `app`, `lib`, `package.json`, dst) ke halaman itu
6. Klik **Commit changes**

## Langkah 2 — Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com), daftar/login pakai akun GitHub Anda (paling mudah)
2. Klik **"Add New" → "Project"**
3. Pilih repository `si-profil-lpb` yang baru diupload → klik **Import**
4. Di bagian **Environment Variables**, tambahkan 2 baris ini (nilainya dari file `.env.local.example`):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://faqqzypzdxsttttxgbst.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (salin dari `.env.local.example`)
5. Klik **Deploy**, tunggu 1-2 menit

## Membuat akun Fasilitator (login Dashboard Admin)
Login sekarang pakai email + password per orang (bukan 1 password bersama). Cara tambah akun:
1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → project **si-profil-lpb**
2. Menu **Authentication** → **Users** → **Add user**
3. Isi email & password Fasilitator tersebut → **Create user**
4. Fasilitator itu langsung bisa login di `si-profil-lpb.vercel.app/admin/login`

Ulangi untuk tiap Fasilitator yang perlu akses.

Setelah selesai, Vercel akan kasih Anda link seperti `si-profil-lpb.vercel.app` — itu link aplikasi Anda, sudah bisa dipakai.

## Cara pakai
- **Link utama** (`si-profil-lpb.vercel.app`) → halaman awal, ada tombol "Daftar UMKM Baru"
- **`si-profil-lpb.vercel.app/daftar`** → form untuk UMKM yang benar-benar baru
- **`si-profil-lpb.vercel.app/f/[ID]/[token]`** → link pribadi permanen tiap UMKM untuk update data (didapat otomatis setelah daftar, atau di-generate ulang kapan saja lewat tombol "Bagikan Link Pribadi" di halaman detail UMKM pada dashboard admin)
- **`si-profil-lpb.vercel.app/admin`** → dashboard Anda sebagai Fasilitator (login pakai email + password akun yang dibuat di Supabase Auth)
- **`si-profil-lpb.vercel.app/admin/wilayah`** → rekap agregat per wilayah
- **`si-profil-lpb.vercel.app/admin/umkm/[ID]/kartu`** → kartu profil UMKM siap cetak/PDF

### Penting soal link pribadi
Link ini **tidak bergantung nomor HP** — jadi tetap valid meski UMKM ganti nomor HP mereka. Untuk 227 UMKM yang belum tercatat nomor HP-nya, cara mendapatkan link pertama kali:
1. Buka Dashboard Admin → cari UMKM tersebut → buka halaman detailnya
2. Klik **"🔗 Bagikan Link Pribadi"** — link & QR code langsung muncul
3. Kirim link itu ke UMKM (WA/print QR), atau isi datanya langsung di situ saat kunjungan

## Kalau ada perubahan kode nanti
Cukup upload ulang file yang berubah ke GitHub (lewat halaman repo, tombol "Add file" → "Upload files") — Vercel otomatis re-deploy dalam 1-2 menit setiap ada perubahan di GitHub.
