# 定期将新项目的优秀代码入库
# 1. 扫描新项目
python3 scripts/kb-ingest-imac77.py

# 2. 去重
python3 scripts/kb-cleanup.py

# 3. 技术栈标记
python3 scripts/kb-tag-techstack.py

# 4. 更新黄金模板标记
psql -h 192.168.3.45 -U postgres -d yyc3_kb -f scripts/batch-tag-golden-templates.sql
