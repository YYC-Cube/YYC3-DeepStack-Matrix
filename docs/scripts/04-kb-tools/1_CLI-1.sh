# 1. 构建 CLI
cd packages/cli
pnpm build

# 2. 全局链接测试
pnpm link --global

# 3. 创建沙箱目录
cd /Volumes/Development/yyc3-platform
mkdir sandbox-test
cd sandbox-test

# 4. 使用基础模板清洗
yyc3 clean --template base

# 5. 启动验证
pnpm dev
