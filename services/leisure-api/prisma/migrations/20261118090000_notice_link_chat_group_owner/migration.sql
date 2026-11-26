-- 013 规划 P0#5 双迁移:notice.link(跳转直读,替换 body 嗅探弱约定)+chat_group 群主/状态(群解散结构)
ALTER TABLE "notice" ADD COLUMN "link" VARCHAR(255);
ALTER TABLE "chat_group" ADD COLUMN "owner_id" INTEGER;
ALTER TABLE "chat_group" ADD COLUMN "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
