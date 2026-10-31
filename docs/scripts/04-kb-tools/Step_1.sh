# Step 1: 选择模板（查询知识库）
psql -h 192.168.3.45 -U postgres -d yyc3_kb -c "
SELECT metadata->>'template_id', metadata->>'ux_pattern'
FROM kb_entries
WHERE metadata->>'golden_template' = 'true'
  AND metadata->>'template_category' = 'ai'
GROUP BY 1,2;
"

# Step 2: 创建项目
npx create-yyc3-app my-new-ai-app --template ai-chat --preset yyc3-dark

# Step 3: 进入项目并安装依赖
cd my-new-ai-app
pnpm install

# Step 4: 初始化 UI
yyc3 init --preset yyc3-dark

# Step 5: 添加业务组件
yyc3 add chat-panel model-selector message-item

# Step 6: 启动开发
pnpm dev
# → 浏览器打开 http://localhost:3300

# Step 7: 开发完成后，将新组件入库
# (假设你写了一个优秀的 patient-timeline 组件)
python3 scripts/kb-ingest-component.py \
  --source ./src/components/patient-timeline.tsx \
  --template tpl-med-full \
  --tags "medical,timeline,react,tsx"
