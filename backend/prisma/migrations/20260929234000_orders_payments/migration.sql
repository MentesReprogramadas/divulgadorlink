-- Pedido e pagamento. promotions permanece; o índice único de ACTIVE não é recriado.
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'EXPIRED', 'PAID_LATE', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED');
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD');
CREATE TYPE "SurfaceHold" AS ENUM ('PENDING_PAYMENT', 'RELEASED');

CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "linkId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "productCode" "PromotionProductCode" NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "savingsCents" INTEGER NOT NULL,
    "pixExpiresAt" TIMESTAMP(3),
    "gatewayChargeId" TEXT,
    "refundCorrelationId" TEXT,
    "refundAttempts" INTEGER NOT NULL DEFAULT 0,
    "refundErrors" JSONB NOT NULL DEFAULT '[]',
    "refundIds" JSONB NOT NULL DEFAULT '[]',
    "idempotencyKey" TEXT,
    "renewal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_surfaces" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "surface" "PromotionSurface" NOT NULL,
    "hold" "SurfaceHold" NOT NULL DEFAULT 'PENDING_PAYMENT',
    CONSTRAINT "order_surfaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orders_tenantId_userId_idempotencyKey_key" ON "orders"("tenantId", "userId", "idempotencyKey");
CREATE INDEX "orders_tenantId_linkId_status_idx" ON "orders"("tenantId", "linkId", "status");
CREATE INDEX "order_surfaces_orderId_idx" ON "order_surfaces"("orderId");
CREATE UNIQUE INDEX "order_surfaces_one_pending" ON "order_surfaces"("linkId", "surface") WHERE "hold" = 'PENDING_PAYMENT';
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");
CREATE UNIQUE INDEX "order_events_orderId_eventId_key" ON "order_events"("orderId", "eventId");

ALTER TABLE "orders" ADD CONSTRAINT "orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_surfaces" ADD CONSTRAINT "order_surfaces_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
