-- YYC³ LeisureAPI · PostgreSQL 运行账号最小化(铁律 2:流水/审计只增不改不删)
-- 执行时机:每次 `prisma migrate deploy` 之后,以库所有者(leisure / 生产 DBA 账号)执行:
--   psql "$DATABASE_URL_OWNER" -f scripts/apply-pg-grants.sql
-- 幂等:REVOKE 对不存在的权限无副作用
-- 只增表:台费流水 / 台票流水 / 审计日志 —— 更正一律走反向流水(REVERSE),不允许 UPDATE/DELETE
REVOKE UPDATE, DELETE ON TABLE stage_fee_txn FROM leisure_app;
REVOKE UPDATE, DELETE ON TABLE ticket_txn    FROM leisure_app;
REVOKE UPDATE, DELETE ON TABLE audit_log     FROM leisure_app;
-- 迁移历史表运行账号只读(prisma migrate 由所有者执行)
REVOKE INSERT, UPDATE, DELETE ON TABLE _prisma_migrations FROM leisure_app;
GRANT SELECT ON TABLE _prisma_migrations TO leisure_app;
