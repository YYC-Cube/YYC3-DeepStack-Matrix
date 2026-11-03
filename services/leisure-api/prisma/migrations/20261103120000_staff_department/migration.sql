-- AlterTable
ALTER TABLE "admin_user" ADD COLUMN     "department_id" INTEGER,
ADD COLUMN     "manager_id" INTEGER,
ADD COLUMN     "title" VARCHAR(32);

-- CreateTable
CREATE TABLE "department" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "parent_id" INTEGER,
    "head_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "department_store_id_name_parent_id_key" ON "department"("store_id", "name", "parent_id");

-- AddForeignKey
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

