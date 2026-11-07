-- YYC³ LeisureManage · split_rule.apply_title 存量回填脚本(2026-11-07 预置;存量出现时执行)
--
-- 背景:分账规则 applyTitle(适用岗位)列后加,存量规则可能为 NULL/空串。
-- 语义:NULL/空 = 「全员」(计提匹配只看 apply_line,见 split-handover.module.ts 规则匹配注释;
--       web 端 label 对空值按全员兜底显示)。因此本脚本默认仅【报告】,不改变任何行为语义;
--       仅当 Owner 明确要将存量规则收敛到某一岗位时才执行 §2 的 UPDATE。
--
-- 执行(生产,所有者账号):
--   psql "$(grep ^DATABASE_URL_OWNER= ~/.yyc3-keybackup/leisure-prod.env | cut -d= -f2-)" \
--     -v newtitle="'MANAGER'" -f scripts/backfill-apply-title.sql
--   (newtitle 取值须为 leisure-core STAFF_TITLES 之一:VP / MANAGER_DIRECTOR / MANAGER / CASHIER / FINANCE)
--
-- ══ §1 存量报告(默认执行;split_plan 无软删列,归档=status='ARCHIVED') ══
SELECT r.id            AS rule_id,
       r.apply_line,
       coalesce(r.apply_title, '(NULL=全员)') AS current_title,
       r.calc_type,
       p.id             AS plan_id,
       p.name           AS plan_name,
       p.status         AS plan_status
FROM split_rule r
JOIN split_plan p ON p.id = r.plan_id
WHERE (r.apply_title IS NULL OR r.apply_title = '')
ORDER BY p.id, r.id;

-- ══ §2 可选回填(默认注释;确认后将注释放开并带 -v newtitle=… 执行) ══
-- 仅回填 ACTIVE 方案下的存量规则;ARCHIVED/DRAFT 方案不动。
-- UPDATE split_rule r
--    SET apply_title = :'newtitle'
--   FROM split_plan p
--  WHERE p.id = r.plan_id
--    AND p.status = 'ACTIVE'
--    AND (r.apply_title IS NULL OR r.apply_title = '');
--
-- 回填后核对:
-- SELECT p.status, r.apply_title, count(*) FROM split_rule r JOIN split_plan p ON p.id = r.plan_id
--  GROUP BY 1, 2 ORDER BY 1, 2;
