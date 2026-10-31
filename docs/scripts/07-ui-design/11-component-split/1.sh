# 1. 更新版本号
pnpm changeset version

# 2. 构建所有包
pnpm build

# 3. 运行测试
pnpm test

# 4. 发布到 npm
pnpm changeset publish

# 5. 创建 GitHub Release
gh release create v1.0.0 --notes "Release notes"
