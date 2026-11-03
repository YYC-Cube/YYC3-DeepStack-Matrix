-- CreateTable
CREATE TABLE "notice" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "published_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notice_store_id_created_at_idx" ON "notice"("store_id", "created_at");

