# 1. 全量质量检查
pnpm -r build && pnpm -r typecheck && pnpm -r lint && pnpm -r test

# 2. 版本号升级（手动编辑或使用 node 脚本）
node -e "const f='packages/core/package.json',p=require(f);p.version='1.5.0';require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')"

# 3. 提交 + 打 Tag
git add -A && git commit -m "release: v1.5.0"
git tag v1.5.0
git push origin main --tags

# 4. CI/CD 自动发布（GitHub Actions）
# 或手动发布:
pnpm publish --filter @yyc3/core --access public --no-git-checks
