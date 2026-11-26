-- 已读回执轻量版(2026-11-19 沟通闭环批:群成员读水位服务端化;IM 标配「已读 N」数据源)
CREATE TABLE "chat_read_state" (
  "id" SERIAL PRIMARY KEY,
  "store_id" INT NOT NULL,
  "group_id" INT NOT NULL,
  "user_scope" VARCHAR(16) NOT NULL,
  "user_id" INT NOT NULL,
  "watermark" INT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "chat_read_state_group_user_key" ON "chat_read_state"("group_id", "user_scope", "user_id");
CREATE INDEX "chat_read_state_group_idx" ON "chat_read_state"("group_id");
