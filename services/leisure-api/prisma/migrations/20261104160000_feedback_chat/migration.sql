-- CreateTable
CREATE TABLE "feedback" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "module" VARCHAR(32) NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "detail" VARCHAR(2000) NOT NULL,
    "photo_keys" JSONB,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "reply" VARCHAR(2000),
    "applicant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "group_id" INTEGER,
    "line" VARCHAR(16),
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "chat_group_id" INTEGER NOT NULL,
    "sender_scope" VARCHAR(16) NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "sender_name" VARCHAR(64) NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_store_id_status_idx" ON "feedback"("store_id", "status");

-- CreateIndex
CREATE INDEX "chat_group_store_id_idx" ON "chat_group"("store_id");

-- CreateIndex
CREATE INDEX "chat_message_chat_group_id_id_idx" ON "chat_message"("chat_group_id", "id");

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_chat_group_id_fkey" FOREIGN KEY ("chat_group_id") REFERENCES "chat_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
