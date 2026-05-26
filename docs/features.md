# Dokumentasi Fitur ProcureFlow ERP

## Authentication & Authorization

| Bagian | Detail |
| --- | --- |
| Description | Login pengguna, penyimpanan JWT, proteksi route, dan role-based access control |
| Main users | Semua role |
| Main actions | Login, logout, get current user, redirect unauthorized |
| Important fields | Email, password, access token, role |
| Expected result | Pengguna hanya dapat mengakses modul sesuai role |

## Dashboard

| Bagian | Detail |
| --- | --- |
| Description | Ringkasan procurement dan monitoring status |
| Main users | Semua role |
| Main actions | Melihat summary card dan chart |
| Important fields | Total PR, approved PR, budget usage, PO status, receiving status |
| Expected result | Pengguna memahami kondisi procurement secara cepat |

## User & Role Management

| Bagian | Detail |
| --- | --- |
| Description | Pengelolaan user dan role sistem |
| Main users | Admin |
| Main actions | Create, read, update, delete/deactivate user dan role |
| Important fields | Email, full name, status, role, department |
| Expected result | User memiliki akses sesuai tanggung jawab |

## Department Management

| Bagian | Detail |
| --- | --- |
| Description | Master data department untuk budget dan PR |
| Main users | Admin |
| Main actions | Create, update, delete/deactivate, search |
| Important fields | Code, name, description, manager, status |
| Expected result | Department dapat digunakan pada budget dan purchase request |

## Item Master

| Bagian | Detail |
| --- | --- |
| Description | Catalog item untuk purchase request dan PO |
| Main users | Admin |
| Main actions | Create, update, delete/deactivate, search |
| Important fields | SKU, name, category, brand, estimated unit price, packaging unit |
| Expected result | Item dapat dipilih pada PR dan receiving |

## Supplier Management

| Bagian | Detail |
| --- | --- |
| Description | Master supplier untuk purchase order |
| Main users | Admin, Purchasing |
| Main actions | Create, update, delete/deactivate, search |
| Important fields | Code, name, contact, email, phone, city, payment terms |
| Expected result | Supplier tersedia saat generate PO |

## Warehouse Management

| Bagian | Detail |
| --- | --- |
| Description | Master lokasi warehouse untuk receiving |
| Main users | Admin |
| Main actions | Create, update, delete/deactivate |
| Important fields | Code, name, address, description, status |
| Expected result | Warehouse digunakan pada purchase order dan receiving |

## Packaging Unit Management

| Bagian | Detail |
| --- | --- |
| Description | Master satuan packaging untuk item |
| Main users | Admin |
| Main actions | Create, update, delete/deactivate |
| Important fields | Code, name, description, status |
| Expected result | Unit digunakan pada item, PR item, dan PO item |

## Budget Management

| Bagian | Detail |
| --- | --- |
| Description | Pengelolaan alokasi budget department |
| Main users | Finance, Admin |
| Main actions | Create budget, update budget, deactivate/cancel budget, lihat transaksi |
| Important fields | Code, name, fiscal year, period, allocated amount, used amount, remaining amount |
| Expected result | Budget tersedia untuk validasi purchase request |

## Purchase Request

| Bagian | Detail |
| --- | --- |
| Description | Permintaan pembelian multi-item |
| Main users | Requester, Admin |
| Main actions | Create draft, update draft, add items, submit PR |
| Important fields | Title, department, budget, item, quantity, estimated price, total amount |
| Expected result | PR tersimpan dan dapat masuk approval workflow |

## Approval Workflow

| Bagian | Detail |
| --- | --- |
| Description | Review dan approval purchase request |
| Main users | Manager, Finance, Admin |
| Main actions | View queue, approve, reject, isi reject reason |
| Important fields | PR status, approver, reject reason, timeline |
| Expected result | PR berubah menjadi approved atau rejected |

## Purchase Order

| Bagian | Detail |
| --- | --- |
| Description | Dokumen pembelian dari approved PR |
| Main users | Purchasing, Admin |
| Main actions | Generate PO, assign supplier, update status |
| Important fields | PO number, supplier, PR reference, items, total amount, status |
| Expected result | PO siap untuk proses receiving dan ERP sync |

## Receiving

| Bagian | Detail |
| --- | --- |
| Description | Penerimaan barang berdasarkan PO |
| Main users | Warehouse, Admin |
| Main actions | Create receiving, partial receiving, full receiving, barcode/item code input |
| Important fields | PO, item, ordered quantity, received quantity, accepted quantity, rejected quantity |
| Expected result | Status receiving dan PO diperbarui |

## ERP Integration Simulation

| Bagian | Detail |
| --- | --- |
| Description | Simulasi sinkronisasi PO ke mock ERP |
| Main users | Purchasing, Admin |
| Main actions | Sync PO, view logs, retry failed sync |
| Important fields | Operation, status, attempt number, external id, error message |
| Expected result | Log ERP sync tercatat dengan status success atau failed |

## Audit Trail

| Bagian | Detail |
| --- | --- |
| Description | Histori aktivitas penting |
| Main users | Admin, Auditor |
| Main actions | View audit list, filter, view detail |
| Important fields | Module, action, actor, entity, old value, new value, timestamp |
| Expected result | Aktivitas bisnis dapat ditelusuri |

## Reporting & Monitoring

| Bagian | Detail |
| --- | --- |
| Description | Monitoring data procurement melalui dashboard, status badge, dan filter |
| Main users | Semua role |
| Main actions | View report, filter list, monitor status |
| Important fields | Status, date, department, user, amount |
| Expected result | Pengguna dapat mengambil keputusan berdasarkan data terbaru |
