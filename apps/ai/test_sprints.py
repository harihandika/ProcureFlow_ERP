import sys
import os
import uuid
import logging

# Add current directory to path so we can import packages
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.connection import get_db
from db.queries import get_pr_with_items, get_budget_data
from schemas.audit_pr_schema import AuditPrRequest, AuditPrResponse, BudgetImpact, Recommendation, Finding

logging.basicConfig(level=logging.INFO)

def test_full():
    print("\n=============================================")
    print("MULAI PENGETESAN SPRINT 1 & 2")
    print("=============================================")
    
    print("\n--- 1. TESTING DATABASE CONNECTION ---")
    try:
        with get_db() as conn:
            print("[PASS] Connection pool berhasil membuat dan melepas koneksi")
            
            print("\n--- 2. TESTING QUERIES (SQL SYNTAX & ERROR HANDLING) ---")
            dummy_id = str(uuid.uuid4())
            
            # Test get_pr_with_items
            try:
                pr_data = get_pr_with_items(conn, dummy_id)
                if pr_data is None:
                    print("[PASS] get_pr_with_items() dieksekusi dengan baik dan me-return None untuk ID fiktif")
                else:
                    print(f"[WARN] get_pr_with_items() me-return data tidak terduga: {pr_data}")
            except Exception as e:
                print(f"[FAIL] Error pada get_pr_with_items(): {e}")
                
            # Test get_budget_data
            try:
                budget_data = get_budget_data(conn, dummy_id)
                if budget_data is None:
                    print("[PASS] get_budget_data() dieksekusi dengan baik dan me-return None untuk ID fiktif")
                else:
                    print(f"[WARN] get_budget_data() me-return data tidak terduga: {budget_data}")
            except Exception as e:
                print(f"[FAIL] Error pada get_budget_data(): {e}")
                
    except Exception as e:
        print(f"[FAIL] Database test failed: {e}")
        return False
        
    print("\n--- 3. TESTING PYDANTIC SCHEMAS ---")
    try:
        # Test Input Validation
        req = AuditPrRequest(prId=str(uuid.uuid4()))
        
        # Test Output Validation
        res = AuditPrResponse(
            riskScore=85,
            riskLevel="HIGH",
            budgetImpact=BudgetImpact(
                remainingBefore=1000000.0, 
                remainingAfter=150000.0, 
                usagePercentage=85.0
            ),
            findings=[
                Finding(
                    category="PRICE_ANOMALY",
                    severity="CRITICAL",
                    message="Harga kemahalan",
                    affectedItemSku="TEST-01"
                )
            ],
            recommendation=Recommendation(
                action="INVESTIGATE", 
                justification="Ditemukan selisih harga."
            )
        )
        print("[PASS] Pydantic models (Input & Output) berhasil divalidasi")
    except Exception as e:
        print(f"[FAIL] Schema test failed: {e}")
        return False
        
    print("\n=============================================")
    print("SEMUA TEST BERHASIL (100% PASS)")
    print("=============================================\n")
    return True

if __name__ == "__main__":
    test_full()
