-- CreateTable
CREATE TABLE "task" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "title" VARCHAR(64) NOT NULL,
    "target_artist_id" INTEGER NOT NULL,
    "target_count" INTEGER NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_store_id_status_idx" ON "task"("store_id", "status");
