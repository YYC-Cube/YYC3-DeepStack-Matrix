# 连接知识库
psql -h 192.168.3.45 -p 5432 -U postgres -d yyc3_kb

# 技术栈分布
SELECT tech_stack, count(*) FROM kb_entries GROUP BY tech_stack ORDER BY count(*) DESC;

# 代码分级分布
SELECT code_tier, count(*) FROM kb_entries GROUP BY code_tier;

# 按技术栈+分级交叉查询
SELECT tech_stack, code_tier, count(*) FROM kb_entries GROUP BY tech_stack, code_tier ORDER BY count(*) DESC;

# 搜索核心代码
SELECT title, category, content_summary FROM kb_entries WHERE code_tier='T2' AND content ILIKE '%agent%' LIMIT 20;
