-- 各布局类型的使用频率
SELECT
    metadata->>'layout_type' AS layout,
    count(DISTINCT metadata->>'template_id') AS template_count
FROM kb_entries
WHERE metadata->>'golden_template' = 'true'
GROUP BY 1
ORDER BY 2 DESC;

-- UX 模式分布
SELECT
    metadata->>'ux_pattern' AS ux_pattern,
    metadata->>'template_category' AS category
FROM kb_entries
WHERE metadata->>'golden_template' = 'true'
  AND metadata->>'ux_pattern' IS NOT NULL
GROUP BY 1,2
ORDER BY 1;

-- 技术栈在模板中的覆盖率
SELECT
    tech_stack,
    count(DISTINCT metadata->>'template_id') AS templates_using
FROM kb_entries
WHERE metadata->>'golden_template' = 'true'
  AND tech_stack IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC;
