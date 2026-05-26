# Dokumentasi API Overview

Base URL lokal:

```text
http://localhost:3001/api
```

API menggunakan JWT Bearer Token untuk endpoint protected.

## Auth

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| POST | `/auth/login` | Login dan mendapatkan access token | Public |
| GET | `/auth/me` | Mengambil current user | Authenticated |

## Users

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/users` | List users | Admin |
| POST | `/users` | Create user | Admin |
| GET | `/users/:id` | Detail user | Admin |
| PATCH | `/users/:id` | Update user | Admin |
| DELETE | `/users/:id` | Delete/deactivate user | Admin |

## Roles

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/roles` | List roles | Admin |
| POST | `/roles` | Create role | Admin |
| GET | `/roles/:id` | Detail role | Admin |
| PATCH | `/roles/:id` | Update role | Admin |
| DELETE | `/roles/:id` | Delete/deactivate role | Admin |

## Departments

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/departments` | List departments | Admin, Requester |
| POST | `/departments` | Create department | Admin |
| GET | `/departments/:id` | Detail department | Admin |
| PATCH | `/departments/:id` | Update department | Admin |
| DELETE | `/departments/:id` | Delete/deactivate department | Admin |

## Items

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/items` | List items | Admin, Requester |
| POST | `/items` | Create item | Admin |
| GET | `/items/:id` | Detail item | Admin |
| PATCH | `/items/:id` | Update item | Admin |
| DELETE | `/items/:id` | Delete/deactivate item | Admin |

## Suppliers

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/suppliers` | List suppliers | Admin, Purchasing |
| POST | `/suppliers` | Create supplier | Admin |
| GET | `/suppliers/:id` | Detail supplier | Admin, Purchasing |
| PATCH | `/suppliers/:id` | Update supplier | Admin |
| DELETE | `/suppliers/:id` | Delete/deactivate supplier | Admin |

## Warehouses

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/warehouses` | List warehouses | Admin |
| POST | `/warehouses` | Create warehouse | Admin |
| GET | `/warehouses/:id` | Detail warehouse | Admin |
| PATCH | `/warehouses/:id` | Update warehouse | Admin |
| DELETE | `/warehouses/:id` | Delete/deactivate warehouse | Admin |

## Packaging Units

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/packaging-units` | List packaging units | Admin |
| POST | `/packaging-units` | Create packaging unit | Admin |
| GET | `/packaging-units/:id` | Detail packaging unit | Admin |
| PATCH | `/packaging-units/:id` | Update packaging unit | Admin |
| DELETE | `/packaging-units/:id` | Delete/deactivate packaging unit | Admin |

## Budgets

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/budgets` | List budgets | Admin, Finance, Requester |
| POST | `/budgets` | Create budget | Admin, Finance |
| GET | `/budgets/:id` | Budget detail | Admin, Finance |
| PATCH | `/budgets/:id` | Update budget | Admin, Finance |
| GET | `/budgets/:id/transactions` | Budget transaction history | Admin, Finance |
| POST | `/budgets/:id/adjustments` | Create budget adjustment | Admin, Finance |

## Purchase Requests

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/purchase-requests` | List PR | Admin, Requester, Manager, Finance, Purchasing |
| POST | `/purchase-requests` | Create draft PR | Admin, Requester |
| GET | `/purchase-requests/:id` | PR detail | Authenticated allowed roles |
| PATCH | `/purchase-requests/:id` | Update draft PR | Admin, Requester |
| POST | `/purchase-requests/:id/items` | Add items to PR | Admin, Requester |
| POST | `/purchase-requests/:id/submit` | Submit PR | Admin, Requester |

## Approvals

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/approvals/my-queue` | Approval queue | Admin, Manager, Finance |
| POST | `/approvals/:id/approve` | Approve PR | Admin, Manager, Finance |
| POST | `/approvals/:id/reject` | Reject PR | Admin, Manager, Finance |

## Purchase Orders

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/purchase-orders` | List PO | Admin, Purchasing, Finance, Warehouse |
| GET | `/purchase-orders/:id` | PO detail | Admin, Purchasing, Finance, Warehouse |
| POST | `/purchase-orders/generate-from-pr/:prId` | Generate PO from approved PR | Admin, Purchasing |
| PATCH | `/purchase-orders/:id/status` | Update PO status | Admin, Purchasing |

## Receiving

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/receiving` | List receiving records | Admin, Warehouse, Purchasing |
| POST | `/receiving` | Create receiving | Admin, Warehouse |
| GET | `/receiving/:id` | Receiving detail | Admin, Warehouse, Purchasing |
| GET | `/receiving/purchase-orders/:purchaseOrderId` | Receiving records by PO | Admin, Warehouse, Purchasing |

## ERP Sync

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/erp-sync/logs` | List ERP sync logs | Admin, Purchasing |
| GET | `/erp-sync/logs/:id` | ERP sync log detail | Admin, Purchasing |
| POST | `/erp-sync/purchase-orders/:purchaseOrderId` | Sync PO to mock ERP | Admin, Purchasing |
| POST | `/erp-sync/retry/:id` | Retry failed sync | Admin, Purchasing |

## Audit Trails

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/audit-trails` | List audit trails | Admin, Auditor |
| GET | `/audit-trails/:id` | Audit trail detail | Admin, Auditor |

## Dashboard

| Method | Endpoint | Description | Required Role |
| --- | --- | --- | --- |
| GET | `/dashboard/summary` | Dashboard summary data jika tersedia | Authenticated |

Catatan: Jika dashboard summary belum memiliki endpoint khusus, frontend dapat menyusun summary dari beberapa endpoint list.
