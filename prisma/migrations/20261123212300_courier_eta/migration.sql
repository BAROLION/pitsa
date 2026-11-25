-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'YOLDA';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "courierPhone" TEXT,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "etaAt" TIMESTAMP(3),
ADD COLUMN     "pickedUpAt" TIMESTAMP(3);
