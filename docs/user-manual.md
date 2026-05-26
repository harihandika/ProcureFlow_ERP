# Panduan Pengguna ProcureFlow ERP

Dokumen ini menjelaskan cara menggunakan ProcureFlow ERP dari sudut pandang pengguna bisnis.

## Overview

ProcureFlow ERP adalah sistem simulasi procurement untuk mengelola permintaan pembelian, budget, approval, purchase order, receiving barang, sinkronisasi ERP, dan audit trail.

Sistem ini dibuat untuk membantu setiap role bekerja dalam alur yang terkontrol, mulai dari pembuatan master data sampai pelacakan aktivitas penting.

## Tujuan Sistem

- Mengurangi proses manual dalam procurement.
- Memastikan purchase request mengikuti batas budget.
- Mempermudah approval oleh Manager dan Finance.
- Menghubungkan purchase request ke purchase order.
- Mencatat penerimaan barang secara partial atau full.
- Mensimulasikan sinkronisasi purchase order ke ERP.
- Menyimpan audit trail untuk aktivitas penting.

## Role Pengguna

| Role | Tanggung Jawab Utama |
| --- | --- |
| Admin | Mengelola user, role, master data, dan audit trail |
| Requester | Membuat dan submit purchase request |
| Manager | Approve atau reject purchase request |
| Finance | Membuat budget dan approve request terkait budget |
| Purchasing | Membuat purchase order dan sync ke ERP |
| Warehouse | Melakukan receiving barang |
| Auditor | Melihat audit trail dan histori aktivitas |

## Cara Login

1. Buka halaman login.
2. Masukkan email dan password.
3. Klik tombol **Sign in**.
4. Setelah berhasil login, pengguna akan diarahkan ke dashboard.

Jika token sudah expired atau tidak valid, sistem akan mengarahkan pengguna kembali ke halaman login.

## Cara Menggunakan Dashboard

Dashboard menampilkan ringkasan proses procurement.

Yang dapat dilihat:

- Jumlah purchase request.
- Status approval.
- Ringkasan budget.
- Status purchase order.
- Status receiving.
- Ringkasan ERP sync.

Gunakan dashboard untuk memantau kondisi procurement secara cepat sebelum membuka modul detail.

## Cara Mengelola Master Data

Master data hanya dikelola oleh Admin.

Modul master data:

- Departments
- Items
- Suppliers
- Warehouses
- Packaging Units

Langkah umum:

1. Login sebagai Admin.
2. Buka menu master data yang ingin dikelola.
3. Klik tombol create.
4. Isi form data.
5. Simpan data.
6. Gunakan fitur edit untuk memperbarui data.
7. Gunakan delete/deactivate untuk menonaktifkan data jika diperlukan.

## Cara Membuat Budget

Budget dibuat oleh Finance atau Admin.

Langkah:

1. Login sebagai Finance.
2. Buka menu **Budgets**.
3. Klik **Create Budget**.
4. Pilih department.
5. Isi kode budget, nama budget, fiscal year, periode, currency, dan allocated amount.
6. Simpan budget.

Hasil:

- Budget aktif akan tersedia untuk purchase request.
- Sistem menghitung allocated amount, used amount, remaining amount, dan usage percentage.
- Jika penggunaan di atas 80%, sistem menampilkan warning.
- Jika budget overspent, sistem menampilkan status danger.

## Cara Membuat Purchase Request

Purchase request dibuat oleh Requester.

Langkah:

1. Login sebagai Requester.
2. Buka menu **Purchase Requests**.
3. Klik **Create PR**.
4. Isi judul request, department, budget, required date, dan deskripsi.
5. Tambahkan item yang dibutuhkan.
6. Isi quantity dan estimated price.
7. Periksa subtotal dan grand total.
8. Klik **Save as Draft** untuk menyimpan draft atau **Submit Request** untuk submit.

Catatan:

- Purchase request dapat memiliki banyak item.
- Sistem menghitung subtotal dan grand total otomatis.
- Jika total melebihi remaining budget, sistem menampilkan warning.

## Cara Approve/Reject Purchase Request

Approval dilakukan oleh Manager dan/atau Finance.

Langkah approve:

1. Login sebagai Manager atau Finance.
2. Buka menu **Approval Queue**.
3. Pilih purchase request.
4. Review detail request, item, total, dan budget.
5. Klik **Approve**.

Langkah reject:

1. Pilih purchase request.
2. Klik **Reject**.
3. Isi alasan reject.
4. Submit rejection.

Hasil:

- Status PR berubah menjadi Approved atau Rejected.
- Aktivitas approval dicatat di audit trail.

## Cara Generate Purchase Order

Purchase order dibuat oleh Purchasing dari PR yang sudah approved.

Langkah:

1. Login sebagai Purchasing.
2. Buka menu **Purchase Orders**.
3. Klik **Generate PO**.
4. Pilih approved purchase request.
5. Pilih supplier.
6. Klik **Generate Draft PO**.
7. Jika diperlukan, update status PO menjadi issued.

Hasil:

- Sistem membuat PO dengan item dari PR.
- Supplier terhubung ke PO.
- PO siap untuk proses receiving.

## Cara Receiving Barang

Receiving dilakukan oleh Warehouse.

Langkah:

1. Login sebagai Warehouse.
2. Buka menu **Receiving**.
3. Klik **Create Receiving**.
4. Pilih purchase order.
5. Lihat daftar item PO.
6. Input barcode atau item code jika diperlukan.
7. Isi received quantity.
8. Pastikan quantity tidak melebihi ordered quantity.
9. Submit receiving.

Hasil:

- Jika hanya sebagian barang diterima, status PO menjadi Partially Received.
- Jika semua barang diterima, status PO menjadi Completed/Received.
- Receiving dicatat dalam audit trail.

## Cara Sync PO ke ERP

ERP sync dilakukan oleh Purchasing.

Langkah:

1. Login sebagai Purchasing.
2. Buka menu **ERP Sync Logs**.
3. Pilih purchase order.
4. Klik **Sync PO**.
5. Periksa status sync.

Status yang mungkin muncul:

- Pending
- Success
- Failed

Jika sync gagal, klik **Retry** pada log yang failed.

## Cara Melihat Audit Trail

Audit trail dapat dilihat oleh Admin atau Auditor.

Langkah:

1. Login sebagai Admin atau Auditor.
2. Buka menu **Audit Trails**.
3. Gunakan filter module, user, action, atau date.
4. Klik detail untuk melihat old value dan new value jika tersedia.

Audit trail membantu melacak aktivitas penting seperti login, create, update, submit, approve, receive, sync ERP, dan retry sync.

## Demo Account

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@procureflow.com` | `password123` |
| Requester | `requester@procureflow.com` | `password123` |
| Manager | `manager@procureflow.com` | `password123` |
| Finance | `finance@procureflow.com` | `password123` |
| Purchasing | `purchasing@procureflow.com` | `password123` |
| Warehouse | `warehouse@procureflow.com` | `password123` |
| Auditor | `auditor@procureflow.com` | `password123` |

## FAQ

### Kenapa saya tidak bisa melihat menu tertentu?

Menu ditampilkan berdasarkan role pengguna. Jika role tidak memiliki akses, menu tidak akan muncul.

### Kenapa purchase request tidak bisa disubmit?

Kemungkinan budget tidak tersedia, item belum lengkap, atau total request melebihi budget.

### Kenapa PO tidak bisa dibuat?

PO hanya dapat dibuat dari purchase request yang sudah approved.

### Kenapa receiving ditolak?

Receiving akan ditolak jika quantity yang diterima melebihi ordered quantity.

### Apa fungsi audit trail?

Audit trail menyimpan histori aktivitas penting agar proses dapat ditelusuri kembali.
