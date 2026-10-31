# 创建新会话目录
mkdir -p "docs/${PROJECT_NAME}-${TUTOR_ID}-$(date +%Y%m%d)"

# 生成审核报告模板
cp templates/audit-report-template.md "docs/.../00-项目现状审核报告.md"

# 查看最近一次会话的总结
ls -lt docs/*/03-*.md | head -1 | xargs cat

# 快速统计本次会话产出
find "docs/${SESSION_DIR}" -name "*.md" | wc -l
