-- CreateTable
CREATE TABLE "login_audit" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "scope" VARCHAR(16) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "ip" VARCHAR(64) NOT NULL,
    "ua" VARCHAR(255) NOT NULL,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_audit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_audit_store_id_user_id_created_at_idx" ON "login_audit"("store_id", "user_id", "created_at");
