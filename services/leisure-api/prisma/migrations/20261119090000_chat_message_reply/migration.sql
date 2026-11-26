-- 沟通闭环批:消息引用回复(IM 标配;reply_to_id 自引用被引消息)
ALTER TABLE "chat_message" ADD COLUMN "reply_to_id" INTEGER;
CREATE INDEX "chat_message_reply_to_id_idx" ON "chat_message"("reply_to_id");
