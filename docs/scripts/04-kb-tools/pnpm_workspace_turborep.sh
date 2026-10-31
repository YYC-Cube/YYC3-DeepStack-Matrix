# 建议使用 pnpm workspace + turborepo 结构
yyc3-monorepo/
├── packages/
│   ├── framework/       # 核心应用骨架（含 next.config.js, 全局样式, 布局组件）
│   ├── ui/              # 组件库 (shadcn + Radix 二次封装)
│   ├── config/          # ESLint, Prettier, TS 配置
│   ├── cli/             # CLI 工具
│   └── scenes/          # 场景配置集（JSON + 定制代码）
├── apps/
│   └── storybook/       # 组件演示
└── tools/               # 代码生成脚本
