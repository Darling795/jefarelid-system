-- Make utility_type free text (fixed set enforced in the UI: electric, phone, water, wifi).
-- Convert the enum column to TEXT, preserving existing data.
ALTER TABLE "utility_bills" ALTER COLUMN "utility_type" TYPE TEXT USING "utility_type"::text;

-- Remap legacy values to the new set.
UPDATE "utility_bills" SET "utility_type" = 'phone' WHERE "utility_type" = 'telephone';
UPDATE "utility_bills" SET "utility_type" = 'wifi' WHERE "utility_type" = 'internet';

-- Drop the old enum type.
DROP TYPE "UtilityType";
