-- AlterTable
ALTER TABLE "chat_message" ADD COLUMN     "images" JSONB,
ADD COLUMN     "type" VARCHAR(16) NOT NULL DEFAULT 'TEXT';
