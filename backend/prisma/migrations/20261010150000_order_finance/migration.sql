ALTER TABLE "orders" ADD COLUMN "paidAt" TIMESTAMP(3);

-- Histórico: a primeira entrega de webhook processada é a melhor aproximação do momento do pagamento.
UPDATE "orders" o
SET "paidAt" = COALESCE(
  (SELECT MIN(e."createdAt") FROM "order_events" e WHERE e."orderId" = o."id"),
  o."updatedAt"
)
WHERE o."status" IN ('PAID', 'PAID_LATE', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED');

CREATE INDEX "orders_tenantId_paidAt_idx" ON "orders"("tenantId", "paidAt");
CREATE INDEX "orders_tenantId_createdAt_idx" ON "orders"("tenantId", "createdAt");

CREATE TABLE "order_meta_contexts" (
    "orderId" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_meta_contexts_pkey" PRIMARY KEY ("orderId")
);

CREATE INDEX "order_meta_contexts_createdAt_idx" ON "order_meta_contexts"("createdAt");
