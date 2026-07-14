import psycopg2.extras
from decimal import Decimal

def _decimal_to_float(data):
    if isinstance(data, dict):
        return {k: _decimal_to_float(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [_decimal_to_float(item) for item in data]
    elif isinstance(data, Decimal):
        return float(data)
    else:
        return data

def get_pr_with_items(conn, pr_id: str) -> dict | None:
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            # Query 1: Data Purchase Request
            cur.execute("""
                SELECT id, "requestNumber", title, description, status, priority,
                       "totalAmount", currency, "departmentId", "budgetId"
                FROM "PurchaseRequest" 
                WHERE id = %s AND "deletedAt" IS NULL;
            """, (pr_id,))
            pr_row = cur.fetchone()
            if not pr_row:
                return None
            
            pr_data = dict(pr_row)
            
            # Query 2: Item-item dalam PR + harga master
            cur.execute("""
                SELECT pri."itemSkuSnapshot" as sku, pri."itemNameSnapshot" as name,
                       pri.quantity, pri."estimatedUnitPrice" as "pricePerUnit", pri."lineTotal",
                       pri."unitNameSnapshot" as unit,
                       i."estimatedUnitPrice" as "masterPrice"
                FROM "PurchaseRequestItem" pri
                JOIN "Item" i ON pri."itemId" = i.id
                WHERE pri."purchaseRequestId" = %s;
            """, (pr_id,))
            items_rows = cur.fetchall()
            
            pr_data["items"] = [dict(row) for row in items_rows]
            return _decimal_to_float(pr_data)
    except Exception as e:
        print(f"Error executing get_pr_with_items: {e}")
        return None

def get_budget_data(conn, budget_id: str) -> dict | None:
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("""
                SELECT id, code, name, "fiscalYear", period,
                       "allocatedAmount", "reservedAmount",
                       "committedAmount", "consumedAmount", status
                FROM "Budget" 
                WHERE id = %s AND "deletedAt" IS NULL;
            """, (budget_id,))
            budget_row = cur.fetchone()
            if not budget_row:
                return None
                
            budget_data = dict(budget_row)
            
            # Calculate remainingAmount
            allocated = budget_data.get("allocatedAmount", 0)
            reserved = budget_data.get("reservedAmount", 0)
            committed = budget_data.get("committedAmount", 0)
            consumed = budget_data.get("consumedAmount", 0)
            
            budget_data["remainingAmount"] = allocated - reserved - committed - consumed
            return _decimal_to_float(budget_data)
    except Exception as e:
        print(f"Error executing get_budget_data: {e}")
        return None
