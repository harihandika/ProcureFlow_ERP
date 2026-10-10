# Runbook deployment ProcureFlow ERP

Panduan ini mengikuti konfigurasi yang benar-benar ada di repo. Alur Docker Compose di bawah cocok untuk menjalankan sistem di laptop atau server uji. Untuk akses publik, siapkan HTTPS, reverse proxy, backup database, dan akun administrator yang aman sebelum membuka aplikasi ke internet.

## Status sebelum push

1. Tinjau `git status` dan `git diff`. File `.env` berisi secret dan harus tetap tidak terlacak oleh Git.
2. Jalankan pemeriksaan pada bagian **Verifikasi**. Commit hanya file yang memang ingin dikirim, lalu push branch Anda. `git push` hanya mengirim kode; tidak otomatis menjalankan layanan.
3. Jangan memakai `npm run prisma:seed` pada database produksi. Seed membuat akun demo dengan kata sandi tetap dan menjalankannya ulang juga mengatur ulang password akun tersebut.
4. Fitur AI dapat ditunda. Web, API, dan database bisa menyala tanpa `GEMINI_API_KEY` dan `GEMINI_MODEL`; permintaan audit AI akan mengembalikan 503 sampai keduanya diisi.

## Prasyarat

- Docker Engine dan Docker Compose plugin aktif; jalankan semua perintah dari root repo.
- Port 3000 dan 3001 bebas untuk penggunaan lokal. Database hanya ada di jaringan Compose dan tidak dipublikasikan ke host.
- Jika memakai server publik, sediakan domain dan reverse proxy HTTPS. Secara default port web dan API diikat ke `127.0.0.1` untuk diakses oleh reverse proxy di host yang sama.

## Konfigurasi

Salin `.env.example` menjadi `.env` di root repo. Isi `POSTGRES_PASSWORD`, `JWT_SECRET`, dan `AI_SERVICE_API_KEY` dengan tiga nilai acak yang berbeda. `AI_SERVICE_API_KEY` adalah secret antara API dan layanan AI, **bukan** kunci dari penyedia model. Jangan menaruh secret di `NEXT_PUBLIC_*` karena nilainya masuk ke bundle browser.

Pada PowerShell, contoh membuat nilai acak adalah:

```powershell
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToHexString($bytes)
```

Jalankan ulang perintah untuk setiap secret dan salin nilainya ke `.env`. Untuk `POSTGRES_PASSWORD`, gunakan karakter heksadesimal seperti contoh agar aman ketika dipakai di URL PostgreSQL. Jika memilih karakter khusus lain, lakukan URL-encoding pada bagian password di connection string.

Untuk laptop, biarkan `FRONTEND_URL=http://localhost:3000`, `CORS_ORIGIN=http://localhost:3000`, dan `NEXT_PUBLIC_API_URL=http://localhost:3001/api`. Pada server HTTPS, ganti dengan domain sebenarnya, misalnya `https://app.example.com` dan `https://api.example.com/api`. `CORS_ORIGIN` dapat memuat beberapa origin yang dipisahkan koma. Perubahan `NEXT_PUBLIC_API_URL` memerlukan build ulang image web karena nilainya dipakai saat build.

Saat sudah memilih model, isi `GEMINI_API_KEY` dan `GEMINI_MODEL` dengan key serta **ID model** yang didukung Google GenAI SDK dan dapat diakses akun Anda. Keduanya kosong secara default. Lihat [daftar model](https://ai.google.dev/gemini-api/docs/models) dan [harga resmi](https://ai.google.dev/gemini-api/docs/pricing) sebelum memilih; ketersediaan dan harga dapat berubah. Simpan key hanya di `.env` atau secret manager.

## Menjalankan dengan Docker Compose

```bash
docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d postgres ai
docker compose -f docker-compose.prod.yml run --rm --no-deps api npm run prisma:deploy -w @procureflow/api
docker compose -f docker-compose.prod.yml up -d api web
docker compose -f docker-compose.prod.yml ps
```

Migrasi memakai `prisma migrate deploy` dan tidak membuat migrasi baru. Jangan gunakan `prisma migrate dev` terhadap database yang memiliki data nyata.

Untuk **database demo baru saja**, Anda boleh mengisi data contoh:

```bash
docker compose -f docker-compose.prod.yml run --rm --no-deps api npm run prisma:seed -w @procureflow/api
```

Seed menghasilkan akun seperti `admin@procureflow.test` dengan password tetap `Password123!`. Akun ini hanya untuk demo lokal/tertutup. Jangan lakukan seed pada aplikasi yang bisa diakses publik. Saat ini repo belum menyediakan proses bootstrap admin produksi tanpa akun demo; pekerjaan itu harus selesai sebelum deployment publik.

## Pemeriksaan setelah start

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 api
docker compose -f docker-compose.prod.yml logs --tail=100 ai
```

Layanan AI tidak mempublikasikan port 8000 ke host. Periksa health endpoint dari dalam container:

```bash
docker compose -f docker-compose.prod.yml exec ai python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').read().decode())"
```

Buka `http://localhost:3000` untuk web. API berada di `http://localhost:3001/api` dan dokumentasi Swagger di `/api/docs`. Jika Anda melakukan seed demo, uji login lalu buka dashboard, buat PR contoh, dan periksa audit trail. Uji fitur AI setelah key dan model diisi, lalu restart layanan AI: `docker compose -f docker-compose.prod.yml up -d --force-recreate ai`.

## Perubahan versi, backup, dan pemulihan

Sebelum update yang membawa migrasi, ambil backup PostgreSQL. Contoh backup melalui container:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres -d procureflow_erp -Fc > procureflow.backup
```

Sesuaikan nama user/database jika Anda mengubah `POSTGRES_USER` atau `POSTGRES_DB`. Simpan backup di lokasi terlindungi dan uji pemulihannya pada database terpisah. Untuk update kode: tarik commit yang diinginkan, rebuild image, jalankan `prisma:deploy` sekali, lalu jalankan ulang `api` dan `web`. Migrasi database tidak otomatis dibatalkan oleh rollback image; periksa kompatibilitas schema sebelum rollback.

## Verifikasi sebelum publikasi

```bash
npm ci
npm run prisma:generate
npm run api:build
npm run api:test
npm run api:test:e2e
npm run web:typecheck
npm run web:test
npm run web:build
```

Tes PostgreSQL tambahan (`npm run api:test:postgres`) memakai database **uji khusus** sesuai konfigurasi test dan tidak boleh diarahkan ke database produksi. Untuk AI, jalankan `python -m unittest discover -s apps/ai/tests -p 'test_*.py'` dari root dengan dependensi `apps/ai/requirements.txt` terpasang.

Sebelum membuka akses publik, pastikan: HTTPS dan reverse proxy aktif; backup dan pemulihan teruji; akun admin dibuat tanpa seed demo; secret tidak masuk Git atau log; domain frontend cocok dengan `CORS_ORIGIN`; URL API browser benar; dan akses Swagger serta database dibatasi sesuai kebutuhan. Layanan AI sebaiknya tetap hanya di jaringan privat Compose.
