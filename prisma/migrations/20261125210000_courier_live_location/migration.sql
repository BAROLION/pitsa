-- Kuryerni jonli kuzatish (Telegram Live Location)
ALTER TABLE "orders" ADD COLUMN "courierToken" TEXT,
ADD COLUMN "courierChatId" TEXT,
ADD COLUMN "courierLat" DOUBLE PRECISION,
ADD COLUMN "courierLng" DOUBLE PRECISION,
ADD COLUMN "courierLocAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "orders_courierToken_key" ON "orders"("courierToken");

-- CreateIndex
CREATE INDEX "orders_courierChatId_idx" ON "orders"("courierChatId");
