-- AlterTable
ALTER TABLE "admin_user" ADD COLUMN     "preset_at" TIMESTAMP(3);

-- 存量回填:已标「首登必改」但无预置时间的账号(迁移前建号),
-- 以本迁移部署时刻起算 24h 预置口令时限,超时未改密登录即冻结
UPDATE "admin_user" SET "preset_at" = NOW() WHERE "must_change_password" = true AND "preset_at" IS NULL;
