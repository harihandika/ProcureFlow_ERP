# Sprint 2: Koneksi Database PostgreSQL + Pydantic Schemas

## Tujuan
Membuat koneksi langsung ke PostgreSQL dari Python dan mendefinisikan kontrak data (Pydantic models) untuk input/output API.

## Prasyarat
- Sprint 1 sudah selesai (folder `apps/ai/` sudah ada)
- PostgreSQL sudah berjalan di localhost:5432

## File yang Harus Dibuat

### 1. `apps/ai/db/connection.py`

Buat modul koneksi database yang:
- Menggunakan `psycopg2` untuk membuat connection pool (`psycopg2.pool.SimpleConnectionPool`)
- Min connections: 1, Max connections: 5
- Baca `DATABASE_URL` dari `config.py`
- Buat fungsi `get_connection()` yang mengambil connection dari pool
- Buat fungsi `release_connection(conn)` yang mengembalikan connection ke pool
- Buat fungsi `close_pool()` untuk cleanup saat server shutdown
- Buat context manager `get_db()` yang otomatis release connection setelah selesai
- Handle error koneksi dengan logging yang jelas

### 2. `apps/ai/db/queries.py`

Buat fungsi-fungsi query database:

**Fungsi `get_pr_with_items(conn, pr_id: str) -> dict | None`:**
```sql
-- Query 1: Data Purchase Request
SELECT id, "requestNumber", title, description, status, priority,
       "totalAmount", currency, "departmentId", "budgetId"
FROM "PurchaseRequest" 
WHERE id = %s AND "deletedAt" IS NULL;

-- Query 2: Item-item dalam PR + harga master
SELECT pri."itemSkuSnapshot", pri."itemNameSnapshot",
       pri.quantity, pri."estimatedUnitPrice", pri."lineTotal",
       pri."unitNameSnapshot",
       i."estimatedUnitPrice" as "masterPrice"
FROM "PurchaseRequestItem" pri
JOIN "Item" i ON pri."itemId" = i.id
WHERE pri."purchaseRequestId" = %s;
```

Return format:
```python
{
    "id": "uuid",
    "requestNumber": "PR-2026-0001",
    "title": "...",
    "totalAmount": Decimal("15000000"),
    "priority": "HIGH",
    "items": [
        {
            "sku": "LAPTOP-001",
            "name": "Laptop Asus ROG",
            "quantity": 3,
            "pricePerUnit": Decimal("18500000"),
            "lineTotal": Decimal("55500000"),
            "unit": "Unit",
            "masterPrice": Decimal("14500000")
        }
    ]
}
```

**Fungsi `get_budget_data(conn, budget_id: str) -> dict | None`:**
```sql
SELECT id, code, name, "fiscalYear", period,
       "allocatedAmount", "reservedAmount",
       "committedAmount", "consumedAmount", status
FROM "Budget" 
WHERE id = %s AND "deletedAt" IS NULL;
```

Return format — hitung `remainingAmount` secara manual di Python:
```python
{
    "id": "uuid",
    "code": "BDG-IT-2026-Q3",
    "name": "Budget IT Q3 2026",
    "allocatedAmount": Decimal("50000000"),
    "reservedAmount": Decimal("5000000"),
    "committedAmount": Decimal("10000000"),
    "consumedAmount": Decimal("22550000"),
    "remainingAmount": Decimal("12450000"),  # calculated
    "status": "ACTIVE"
}
```

PENTING: Konversi semua `Decimal` ke `float` sebelum return agar bisa di-serialize ke JSON.

### 3. `apps/ai/schemas/audit_pr_schema.py`

Buat Pydantic v2 models (gunakan `from pydantic import BaseModel`):

```python
class AuditPrRequest(BaseModel):
    prId: str  # UUID of Purchase Request

class Finding(BaseModel):
    category: Literal["PRICE_ANOMALY", "BUDGET_WARNING", "SUPPLIER_RISK", "GENERAL"]
    severity: Literal["INFO", "WARNING", "CRITICAL"]
    message: str
    affectedItemSku: str | None = None

class BudgetImpact(BaseModel):
    remainingBefore: float
    remainingAfter: float
    usagePercentage: float  # 0-100

class Recommendation(BaseModel):
    action: Literal["APPROVE", "REJECT", "INVESTIGATE"]
    justification: str

class AuditPrResponse(BaseModel):
    riskScore: int  # 0-100
    riskLevel: Literal["LOW", "MEDIUM", "HIGH"]
    budgetImpact: BudgetImpact
    findings: list[Finding]
    recommendation: Recommendation
```

## Verifikasi

Setelah semua file dibuat:
1. Buat script test sederhana di `apps/ai/` yang:
   - Import `get_connection` dari `db/connection.py`
   - Coba jalankan query sederhana `SELECT COUNT(*) FROM "PurchaseRequest"`
   - Print hasilnya untuk memastikan koneksi berhasil
2. Jalankan script tersebut dan pastikan koneksi database berhasil
3. Hapus script test setelah verifikasi berhasil

## Output Sprint

Laporkan semua file yang dibuat dan hasil verifikasi koneksi database.
