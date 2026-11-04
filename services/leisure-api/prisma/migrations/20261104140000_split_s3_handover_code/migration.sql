-- AlterTable
ALTER TABLE "shift_handover" ADD COLUMN     "confirm_code" VARCHAR(8);

-- AlterTable
ALTER TABLE "split_plan" ADD COLUMN     "budget_amount" DECIMAL(12,2);
