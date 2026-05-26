# Dokumentasi Role Access

## Prinsip Akses

ProcureFlow ERP menggunakan role-based access control. Setiap role hanya dapat melihat dan menjalankan aksi sesuai tanggung jawabnya.

Legenda:

- CRUD: Create, Read, Update, Delete
- Read: hanya melihat data
- Approve: melakukan approval atau rejection
- Sync: melakukan sinkronisasi ke ERP
- Retry: mencoba ulang ERP sync yang gagal
- No Access: tidak memiliki akses

## Access Matrix

| Module | Admin | Requester | Manager | Finance | Purchasing | Warehouse | Auditor |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Read | Read | Read | Read | Read | Read | Read |
| Users | CRUD | No Access | No Access | No Access | No Access | No Access | Read |
| Roles | CRUD | No Access | No Access | No Access | No Access | No Access | Read |
| Departments | CRUD | Read | Read | Read | Read | Read | Read |
| Items | CRUD | Read | Read | Read | Read | Read | Read |
| Suppliers | CRUD | No Access | No Access | Read | Read | No Access | Read |
| Warehouses | CRUD | No Access | No Access | No Access | Read | Read | Read |
| Packaging Units | CRUD | Read | Read | Read | Read | Read | Read |
| Budgets | CRUD | Read | Read | CRUD | Read | No Access | Read |
| Purchase Requests | CRUD | CRUD | Read | Read | Read | No Access | Read |
| Approvals | Approve | No Access | Approve | Approve | No Access | No Access | Read |
| Purchase Orders | CRUD | No Access | Read | Read | CRUD | Read | Read |
| Receiving | CRUD | No Access | No Access | Read | Read | CRUD | Read |
| ERP Sync Logs | Sync, Retry, Read | No Access | No Access | Read | Sync, Retry, Read | No Access | Read |
| Audit Trail | Read | No Access | No Access | No Access | No Access | No Access | Read |

## Ringkasan Per Role

### Admin

Admin memiliki akses paling luas untuk konfigurasi sistem, master data, user, role, dan audit.

### Requester

Requester fokus pada pembuatan purchase request dan monitoring status PR miliknya.

### Manager

Manager bertugas melakukan approval atau rejection terhadap purchase request.

### Finance

Finance mengelola budget dan melakukan approval pada request yang berhubungan dengan kontrol budget.

### Purchasing

Purchasing membuat purchase order, mengelola supplier assignment, dan melakukan ERP sync.

### Warehouse

Warehouse mencatat receiving barang berdasarkan purchase order.

### Auditor

Auditor fokus pada review data dan audit trail tanpa mengubah data transaksi.
