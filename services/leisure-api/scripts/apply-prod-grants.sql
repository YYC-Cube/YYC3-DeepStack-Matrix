-- YYC³ LeisureAPI · 既有卷应用授权补丁(与 docker/mysql-init/02-accounts.sql 同一授权体)
-- 用法:docker exec -i leisure-mysql mysql -uroot -p < services/leisure-api/scripts/apply-prod-grants.sql
-- 说明:与 init 版本保持同步维护;新增表时两份同改(可变表全 DML;流水/审计只增)

CREATE USER IF NOT EXISTS 'leisure_app'@'%' IDENTIFIED BY 'leisure-app-dev-only';

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

GRANT SELECT, INSERT ON `leisure`.`stage_fee_txn` TO 'leisure_app'@'%';
GRANT SELECT, INSERT ON `leisure`.`ticket_txn` TO 'leisure_app'@'%';
GRANT SELECT, INSERT ON `leisure`.`audit_log` TO 'leisure_app'@'%';
GRANT SELECT, INSERT ON `leisure`.`wechat_bind_log` TO 'leisure_app'@'%';

FLUSH PRIVILEGES;
