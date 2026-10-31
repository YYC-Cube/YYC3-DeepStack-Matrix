# 1. 从知识库发现高质量项目
psql -h 192.168.3.45 -U postgres -d yyc3_kb -c "
SELECT source_path, count(*), sum(length(content)) AS total_bytes
FROM kb_entries
WHERE code_tier = 'T2' AND tech_stack = 'nextjs'
GROUP BY 1 ORDER BY 3 DESC LIMIT 20;
"

# 2. 评估候选项目
node interactive-analyzer.js
# → 选择路径 → 分析 → 查看报告

# 3. 创建模板目录
mkdir -p Git-YY-Nexus/yyc3-tools-devtemplate/new-template/

# 4. 提取核心文件
# 从候选项目复制 layout.tsx, page.tsx, 核心组件

# 5. 编写 TEMPLATE.json

# 6. 在知识库中标记
# UPDATE kb_entries SET metadata = ...

# 7. 测试
npx create-yyc3-app test-project --template new-template
