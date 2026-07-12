# ProcureFlow ERP - Workspace Guidelines

Sistem ERP Procurement dengan arsitektur Monorepo.

## Struktur Workspace
*   **Frontend**: [apps/web](file:///c:/Users/harih/Documents/AI%20+%20Software%20Enggineer/ProcureFlow_ERP/apps/web) (Next.js 15, React 19, Tailwind CSS, TanStack Query)
*   **Backend**: [apps/api](file:///c:/Users/harih/Documents/AI%20+%20Software%20Enggineer/ProcureFlow_ERP/apps/api) (NestJS, Passport JWT, class-validator)
*   **Database**: [prisma](file:///c:/Users/harih/Documents/AI%20+%20Software%20Enggineer/ProcureFlow_ERP/prisma) (Prisma ORM dengan PostgreSQL)
*   **Dokumentasi**: [docs](file:///c:/Users/harih/Documents/AI%20+%20Software%20Enggineer/ProcureFlow_ERP/docs) (Alur bisnis, fitur, dan skema database)

## Aturan Bisnis Utama (Data Integrity)
1.  **Validasi Budget**: Purchase Request (PR) tidak boleh disubmit jika budget departemen tidak mencukupi (`totalAmount` > `remainingAmount`).
2.  **Konversi PR ke PO**: Purchase Order (PO) hanya boleh digenerate dari PR yang berstatus `APPROVED`.
3.  **Penerimaan Barang**: Jumlah barang yang diterima (`received quantity`) pada proses Receiving tidak boleh melebihi jumlah barang yang dipesan pada PO (`ordered quantity`).
4.  **Audit Trail**: Setiap aktivitas penting (Create, Update, Delete, Approval, Sync ERP) wajib mencatat histori di tabel `AuditTrail`.
5.  **ERP Sync**: Jika sinkronisasi ke Mock ERP gagal, simpan log detail error dan sediakan fitur retry.

## Standar Kode & Konvensi
*   Gunakan TypeScript secara ketat. Hindari tipe `any`.
*   Gunakan Tailwind CSS untuk antarmuka frontend.
*   Gunakan DTO (Data Transfer Object) dengan `class-validator` di sisi backend NestJS.
