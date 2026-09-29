# Perbaikan integritas transaksi dan akses PR

## Perilaku

- Requester hanya membaca PR miliknya; Manager membaca PR departemennya. Admin, Finance, dan Purchasing tetap memiliki scope lintas departemen. Filter daftar tidak dapat memperluas akses.
- Endpoint audit AI memeriksa scope PR sebelum menghubungi FastAPI.
- Submit PR, keputusan approval/rejection, receiving, generate PO, generate invoice, dan pembayaran invoice memakai transaksi Serializable dengan maksimal tiga percobaan khusus konflik Prisma P2034.
- Pembacaan/validasi, perubahan bisnis, ledger terkait, dan audit berada dalam transaksi yang sama pada alur tersebut. Kegagalan audit membatalkan transaksi.
- Reject PR melepaskan reservasi tepat sekali. Ledger reservasi yang tidak cocok dengan PR ditolak untuk rekonsiliasi, bukan dikoreksi diam-diam.
- Satu PR memiliki maksimal satu PO yang belum soft-delete. PO CANCELLED tetap dihitung jika belum soft-delete. Konflik menghasilkan HTTP 409.
- Invoice baru hanya dapat dibuat setelah PO RECEIVED. PARTIALLY_RECEIVED belum dapat ditagihkan. Perhitungan uang memakai Decimal dan dibulatkan ke dua desimal per baris invoice.

Perubahan ini tidak menambahkan perpindahan otomatis reserved -> committed -> consumed. Invoice parsial yang sudah ada tidak diubah; periksa dan rekonsiliasi sebelum membuat tagihan baru.

## Autentikasi AI

Gunakan `AI_SERVICE_API_KEY` yang sama pada backend NestJS dan AI FastAPI. Nilainya harus acak, unik untuk deployment, dan tidak disimpan dalam Git. Backend mengirim header `X-AI-Service-Key`.

Endpoint `/ai/audit-pr` menolak key hilang/salah dengan 401. Jika service belum dikonfigurasi, respons 503; health tidak membutuhkan key. Test tidak menggunakan Gemini nyata.

Untuk lokal, simpan key pada `apps/api/.env` dan `apps/ai/.env`; restart kedua service setelah memperbarui environment. `PYTHON_AI_SERVICE_URL` backend lokal adalah `http://localhost:8000`.

Untuk Docker production, sediakan key melalui environment shell atau `.env` root yang diabaikan Git. Compose mengharuskan key tersedia dan hanya backend yang mengakses AI melalui `http://ai:8000`; port 8000 tidak dipublikasikan.

URL PostgreSQL Python harus tanpa `?schema=public`. Parameter tersebut khusus Prisma dan tidak diterima psycopg2. Contoh environment dan konfigurasi AI Docker sudah mengikuti aturan ini.

## Migrasi unique index PO

Migrasi baru: `prisma/migrations/20260927000100_active_po_unique/migration.sql`.

1. Jalankan query read-only `prisma/preflight-active-po.sql` pada database tujuan.
2. Jika ditemukan PO aktif ganda untuk PR yang sama, rekonsiliasi bersama pemilik data. Jangan menghapus dokumen secara otomatis.
3. Setelah preflight bersih dan deployment disetujui, jalankan `npm run prisma:deploy -w @procureflow/api` pada environment tujuan.

Index bersifat partial (`deletedAt IS NULL`, `purchaseRequestId IS NOT NULL`) dan didefinisikan melalui SQL karena tidak direpresentasikan oleh schema Prisma yang dipakai proyek. Pertahankan migrasi tersebut; `prisma db push` saja tidak memasang index ini.

Migrasi lama `20260725104231_invoice_and_approval` menambahkan beberapa nilai enum. PostgreSQL 11 tidak dapat menjalankan ALTER TYPE ADD VALUE dalam transaksi. Gunakan PostgreSQL 16 sesuai Docker proyek untuk deployment normal. Jangan mengedit checksum migrasi lama yang sudah diterapkan. Pemulihan yang diperlukan pada PostgreSQL 11 harus dilakukan terpisah dan hanya setelah memeriksa status migrasi.

## Verifikasi

Unit/backend dan frontend:

```powershell
npm run api:test
npm run api:test:e2e
npm run web:test
& '.\node_modules\.bin\tsc.cmd' --noEmit --incremental false -p apps/api/tsconfig.json
& '.\node_modules\.bin\tsc.cmd' --noEmit --incremental false -p apps/web/tsconfig.json
& '.\apps\ai\venv\Scripts\python.exe' -m unittest discover -s apps/ai/tests -v
```

Test transaksi nyata membutuhkan database lokal khusus yang sudah dimigrasikan. Nama database harus diawali `procureflow_test_`. Jangan memakai DATABASE_URL aplikasi sebagai TEST_DATABASE_URL.

```powershell
$env:TEST_DATABASE_URL = '<URL database test lokal terisolasi>'
npm run api:test:postgres
```

Suite memakai dua Prisma client berbeda dan barrier pada pembacaan awal untuk memastikan transaksi overlap. Pengujian mencakup reservasi, keputusan bersamaan, over-receiving, receiving beberapa baris, PO/invoice ganda, pembayaran ganda, rollback audit, scope akses, dan unique index termasuk soft-delete.

Suite tidak melakukan TRUNCATE, reset, atau migrasi otomatis. Fixture memiliki kode unik agar test dapat dijalankan ulang tanpa menghapus data. Database test dapat dibersihkan terpisah setelah tidak lagi dibutuhkan.

Proyek belum memiliki workflow CI pada saat perbaikan ini. Untuk menambahkan job CI, sediakan PostgreSQL test terisolasi, migrasikan sebelum test, dan gunakan secret CI khusus test. Jangan menghubungkan job test ke database production.
