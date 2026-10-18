-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'login';
ALTER TYPE "AuditAction" ADD VALUE 'logout';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "position" TEXT;

-- CreateTable
CREATE TABLE "tenant_credits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "remaining" DECIMAL(14,2) NOT NULL,
    "source_invoice_id" TEXT,
    "note" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_credits_tenant_id_idx" ON "tenant_credits"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_credits" ADD CONSTRAINT "tenant_credits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
