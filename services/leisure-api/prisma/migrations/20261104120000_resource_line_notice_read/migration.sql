-- AlterTable
ALTER TABLE "artist" ADD COLUMN     "line" VARCHAR(16);

-- CreateTable
CREATE TABLE "notice_read" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "notice_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "viewer_scope" VARCHAR(16) NOT NULL,
    "viewer_title" VARCHAR(32),
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_read_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notice_read_store_id_notice_id_idx" ON "notice_read"("store_id", "notice_id");

-- CreateIndex
CREATE UNIQUE INDEX "notice_read_notice_id_user_id_key" ON "notice_read"("notice_id", "user_id");

-- AddForeignKey
ALTER TABLE "notice_read" ADD CONSTRAINT "notice_read_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

