-- CreateEnum
CREATE TYPE "InvInvoiceVariant" AS ENUM ('ATOZEE', 'ATOZEE_YUCHAI');

-- AlterTable
ALTER TABLE "inv_items" ADD COLUMN     "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "inv_invoices" ADD COLUMN     "customer_address" TEXT,
ADD COLUMN     "job_description" TEXT,
ADD COLUMN     "ref_no" TEXT,
ADD COLUMN     "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tin_number" TEXT,
ADD COLUMN     "variant" "InvInvoiceVariant" NOT NULL DEFAULT 'ATOZEE',
ADD COLUMN     "vat_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vat_rate" DECIMAL(5,2) NOT NULL DEFAULT 7.5;

-- CreateTable
CREATE TABLE "inv_invoice_counters" (
    "day" TEXT NOT NULL,
    "last" INTEGER NOT NULL,

    CONSTRAINT "inv_invoice_counters_pkey" PRIMARY KEY ("day")
);
