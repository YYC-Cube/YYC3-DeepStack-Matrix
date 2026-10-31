# 创建项目：指定主题 + 场景（可多选）
npx create-yyc3-app my-cyber-crm --theme cyberpunk --scenes crm,ai-chat

# 列出所有可用主题
yyc3 theme list

# 列出所有可用场景
yyc3 scene list

# 向已有项目添加场景
cd my-cyber-crm
yyc3 scene add dashboard

# 切换主题（保留场景不变）
yyc3 theme switch futuristic

# 预览主题+场景组合效果
yyc3 preview --theme aurora --scenes dashboard,music
