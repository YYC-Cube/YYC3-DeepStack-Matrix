# 模板随 Next.js 版本升级
# 在 TEMPLATE.json 中记录版本

# 查看当前所有模板的框架版本
psql -h 192.168.3.45 -U postgres -d yyc3_kb -c "
SELECT
    metadata->>'template_id' AS id,
    metadata->>'template_source' AS source,
    max(created_at) AS last_updated
FROM kb_entries
WHERE metadata->>'golden_template' = 'true'
GROUP BY 1,2
ORDER BY 3 DESC;
"
