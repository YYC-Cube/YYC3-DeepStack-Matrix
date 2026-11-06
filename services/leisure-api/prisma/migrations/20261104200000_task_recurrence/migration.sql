-- AlterTable
ALTER TABLE "task" ADD COLUMN     "notify_at" TIMESTAMP(3),
ADD COLUMN     "recurrence" VARCHAR(16) NOT NULL DEFAULT 'NONE';
