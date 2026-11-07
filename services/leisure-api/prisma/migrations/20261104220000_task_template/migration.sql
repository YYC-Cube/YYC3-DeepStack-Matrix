-- CreateTable
CREATE TABLE "task_template" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "title" VARCHAR(64) NOT NULL,
    "target_count" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "recurrence" VARCHAR(16) NOT NULL DEFAULT 'NONE',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_template_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_template_store_id_deleted_at_idx" ON "task_template"("store_id", "deleted_at");
