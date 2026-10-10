-- CreateEnum
CREATE TYPE "InvRole" AS ENUM ('GLOBAL_ADMIN', 'YUCHAI_STAFF', 'ATOZEE_STAFF');

-- CreateEnum
CREATE TYPE "InvMovementType" AS ENUM ('ADDED', 'REMOVED');

-- CreateTable
CREATE TABLE "inv_users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "InvRole" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "session_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_items" (
    "id" TEXT NOT NULL,
    "part_number" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_zh" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_at" INTEGER NOT NULL DEFAULT 5,
    "price_ngn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "invoiceable" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_movements" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "part_number" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "type" "InvMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "user_id" TEXT,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inv_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_invoices" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_contact" TEXT,
    "notes" TEXT,
    "lines" JSONB NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "created_by_id" TEXT,
    "created_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inv_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inv_users_username_key" ON "inv_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "inv_items_part_number_key" ON "inv_items"("part_number");

-- CreateIndex
CREATE INDEX "inv_items_category_idx" ON "inv_items"("category");

-- CreateIndex
CREATE INDEX "inv_items_is_deleted_idx" ON "inv_items"("is_deleted");

-- CreateIndex
CREATE INDEX "inv_movements_created_at_idx" ON "inv_movements"("created_at");

-- CreateIndex
CREATE INDEX "inv_movements_type_idx" ON "inv_movements"("type");

-- CreateIndex
CREATE INDEX "inv_movements_item_id_idx" ON "inv_movements"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "inv_invoices_number_key" ON "inv_invoices"("number");

-- CreateIndex
CREATE INDEX "inv_invoices_created_at_idx" ON "inv_invoices"("created_at");

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inv_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_movements" ADD CONSTRAINT "inv_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "inv_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_invoices" ADD CONSTRAINT "inv_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "inv_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
