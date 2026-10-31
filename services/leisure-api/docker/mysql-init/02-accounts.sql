-- YYC³ LeisureAPI · 应用账号最小化(11 号文档 §七;铁律 2:流水/审计表 DB 层 REVOKE)
-- 用途:docker/mysql-init/02-accounts.sql 于全新数据卷首部时自动执行;既有卷执行
--      scripts/apply-prod-grants.sql(同一份授权体)。运行时 DATABASE_URL 使用 leisure_app;
--      prisma migrate 继续用 leisure 账号(需 DDL+影子库,见 README-DEV)。
-- 密码仅为本地开发;生产凭据走密钥管理,不入库不入文档。

-- 受限应用账号(只 DML,无 DDL)
CREATE USER IF NOT EXISTS 'leisure_app'@'%' IDENTIFIED BY 'leisure-app-dev-only';

-- 可变业务表:全 DML(逐表白名单——MySQL 表级 REVOKE 不能抵消库级 GRANT,故不做库级授权)
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`store` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`room_type` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`room` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`artist_group` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`artist_level` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`artist` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`transfer_workorder` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`attendance_report` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`show_session` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`stage_fee_rule` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`pay_order` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`approval` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`ticket_rule` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`artist_order` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`artist_review` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`artist_booking` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`showcase_cast` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`admin_user` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`role` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`role_store` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`idempotency_keys` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`store_config` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`openapi_event` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`daily_summary` TO 'leisure_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON `leisure`.`job_run_log` TO 'leisure_app'@'%';

-- 资金/审计/绑定历史:只增(SELECT+INSERT;UPDATE/DELETE 不授=REVOKE 语义)
GRANT SELECT, INSERT ON `leisure`.`stage_fee_txn` TO 'leisure_app'@'%';
GRANT SELECT, INSERT ON `leisure`.`ticket_txn` TO 'leisure_app'@'%';
GRANT SELECT, INSERT ON `leisure`.`audit_log` TO 'leisure_app'@'%';
GRANT SELECT, INSERT ON `leisure`.`wechat_bind_log` TO 'leisure_app'@'%';

FLUSH PRIVILEGES;
