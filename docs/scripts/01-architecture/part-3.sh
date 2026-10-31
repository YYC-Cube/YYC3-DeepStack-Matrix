# 构建
pnpm --filter @yyc3/<pkg> build           # 构建单个包
pnpm -r build                              # 构建全部包

# 类型检查
pnpm --filter @yyc3/<pkg> typecheck        # 单包类型检查
pnpm -r typecheck                          # 全部类型检查

# 测试
pnpm --filter @yyc3/<pkg> test             # 单包测试
pnpm -r test                               # 全部测试
pnpm --filter @yyc3/<pkg> test:coverage    # 带覆盖率测试

# 代码检查
pnpm --filter @yyc3/<pkg> lint             # 单包 lint
pnpm -r lint                               # 全部 lint
