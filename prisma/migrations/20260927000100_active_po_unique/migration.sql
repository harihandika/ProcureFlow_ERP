-- Preflight existing duplicates before applying this migration; do not delete records automatically.
CREATE UNIQUE INDEX "PurchaseOrder_active_purchaseRequestId_key"
ON "PurchaseOrder" ("purchaseRequestId")
WHERE "deletedAt" IS NULL AND "purchaseRequestId" IS NOT NULL;
