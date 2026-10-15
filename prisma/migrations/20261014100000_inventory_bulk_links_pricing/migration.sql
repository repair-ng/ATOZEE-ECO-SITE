-- CreateEnum
CREATE TYPE "InvPaymentStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "inv_items" ADD COLUMN     "cost_cny" DECIMAL(12,2),
ADD COLUMN     "engine_numbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "link_qty" INTEGER,
ADD COLUMN     "linked_item_id" TEXT,
ADD COLUMN     "margin_pct" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "inv_invoices" ADD COLUMN     "error_flagged_at" TIMESTAMP(3),
ADD COLUMN     "error_flagged_by" TEXT,
ADD COLUMN     "error_reason" TEXT,
ADD COLUMN     "is_error" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "paid_by_name" TEXT,
ADD COLUMN     "payment_status" "InvPaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "stock_deducted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "inv_settings" (
    "id" TEXT NOT NULL,
    "cny_to_ngn" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "default_margin_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "updated_by_name" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inv_items_engine_numbers_idx" ON "inv_items"("engine_numbers");

-- CreateIndex
CREATE INDEX "inv_items_linked_item_id_idx" ON "inv_items"("linked_item_id");

-- CreateIndex
CREATE INDEX "inv_invoices_payment_status_idx" ON "inv_invoices"("payment_status");

-- AddForeignKey
ALTER TABLE "inv_items" ADD CONSTRAINT "inv_items_linked_item_id_fkey" FOREIGN KEY ("linked_item_id") REFERENCES "inv_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
