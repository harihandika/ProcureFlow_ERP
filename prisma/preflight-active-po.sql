-- Read-only: resolve any rows returned before applying the active PO unique index.
SELECT "purchaseRequestId", count(*) AS "activePoCount", array_agg("poNumber") AS "poNumbers"
FROM "PurchaseOrder"
WHERE "deletedAt" IS NULL AND "purchaseRequestId" IS NOT NULL
GROUP BY "purchaseRequestId"
HAVING count(*) > 1;
