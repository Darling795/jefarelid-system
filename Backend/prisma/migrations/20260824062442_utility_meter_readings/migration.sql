-- AlterTable
ALTER TABLE "utility_bills" ADD COLUMN     "current_reading" DECIMAL(14,2),
ADD COLUMN     "previous_reading" DECIMAL(14,2),
ADD COLUMN     "rate_per_unit" DECIMAL(14,4);
