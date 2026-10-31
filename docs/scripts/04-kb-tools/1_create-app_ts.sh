cd /Volumes/Development/YYC3-π³/packages/cli

# 1. 编辑 create-app.ts，添加新模板类型
# 2. 在 src/templates/ 下创建对应的模板文件生成逻辑
# 3. 构建 & 测试
pnpm build
node dist/create-app.js test-project --template dashboard --preset yyc3-dark
