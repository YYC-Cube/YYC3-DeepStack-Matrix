---
file: YYC3-MONOREPO-QUICK-START-GUIDE.md
description: YYC³ Monorepo 快速实施指南
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-04-08
updated: 2026-04-08
status: active
tags: [Monorepo],[快速指南],[实施步骤]
category: guide
language: zh-CN
audience: developers
complexity: intermediate
---

# YYC³ Monorepo 快速实施指南

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 🚀 快速开始

### 前置条件

- Node.js >= 20.x
- pnpm >= 9.x
- Git

### 一键初始化脚本

```bash
#!/bin/bash
# init-monorepo.sh

set -e

echo "🚀 开始初始化 YYC³ Monorepo..."

# 1. 创建 workspace 根目录
echo "📁 创建 workspace 根目录..."
mkdir -p yyc3-workspace
cd yyc3-workspace

# 2. 初始化 pnpm workspace
echo "📦 初始化 pnpm workspace..."
pnpm init
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
  - 'packages/core/*'
EOF

# 3. 安装 Turborepo
echo "⚡ 安装 Turborepo..."
pnpm add -Dw turbo

# 4. 创建 turbo.json
echo "🔧 创建 turbo.json..."
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false
    }
  }
}
EOF

# 5. 创建核心包目录
echo "📚 创建核心包目录..."
mkdir -p packages/core/{ui,hooks,types,i18n,utils,zero-dep}
mkdir -p packages/{cloudpivot,ai-family}
mkdir -p tools/{scripts,configs,generators}
mkdir -p docs/{packages,guides,api}

# 6. 创建共享 TypeScript 配置
echo "⚙️ 创建共享 TypeScript 配置..."
mkdir -p tools/configs
cat > tools/configs/tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
EOF

# 7. 创建根 package.json
echo "📝 创建根 package.json..."
cat > package.json << 'EOF'
{
  "name": "yyc3-workspace",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev": "turbo run dev",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
EOF

# 8. 创建 .gitignore
echo "🚫 创建 .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules
.pnpm-store

# Build outputs
dist
dist-electron
.next
.nuxt
.output

# Cache
.turbo
.cache
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode
.idea
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Testing
coverage
.nyc_output

# Misc
*.local
EOF

# 9. 创建 README.md
echo "📖 创建 README.md..."
cat > README.md << 'EOF'
# YYC³ Workspace

YYC³ 组件库 Monorepo 工作空间。

## 快速开始

\`\`\`bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行测试
pnpm test

# 启动开发服务器
pnpm dev
\`\`\`

## 包结构

- \`packages/core/*\` - 核心共享包
- \`packages/cloudpivot\` - 主项目
- \`packages/ai-family\` - AI Family 独立项目

## 文档

详细文档请查看 [docs](./docs) 目录。
EOF

echo "✅ Monorepo 初始化完成！"
echo ""
echo "下一步："
echo "1. cd yyc3-workspace"
echo "2. pnpm install"
echo "3. 开始创建核心包"
```

### 使用方法

```bash
# 下载脚本
curl -O https://raw.githubusercontent.com/YanYuCloudCube/YYC3-CloudPivot-Intelli-Matrix/main/scripts/init-monorepo.sh

# 添加执行权限
chmod +x init-monorepo.sh

# 运行脚本
./init-monorepo.sh
```

---

## 📦 核心包创建

### 1. 创建 @yyc3/types

```bash
#!/bin/bash
# create-types-package.sh

set -e

echo "📦 创建 @yyc3/types 包..."

# 创建目录结构
mkdir -p packages/core/types/src

# 创建 package.json
cat > packages/core/types/package.json << 'EOF'
{
  "name": "@yyc3/types",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": ["src"],
  "keywords": ["yyc3", "types", "typescript"],
  "author": "YanYuCloudCube Team <admin@0379.email>",
  "license": "MIT"
}
EOF

# 创建 tsconfig.json
cat > packages/core/types/tsconfig.json << 'EOF'
{
  "extends": "../../../tools/configs/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
EOF

# 创建类型文件
cat > packages/core/types/src/index.ts << 'EOF'
/**
 * file: index.ts
 * description: YYC³ 类型定义主入口
 * author: YanYuCloudCube Team
 * version: v1.0.0
 */

// Button 组件 Props
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  loading?: boolean;
}

// Card 组件 Props
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

// Input 组件 Props
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  size?: 'default' | 'sm' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

// 用户数据模型
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'developer' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

// 节点数据模型
export interface NodeData {
  id: string;
  name: string;
  type: 'server' | 'service' | 'database' | 'cache';
  status: 'healthy' | 'warning' | 'error' | 'offline';
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  lastUpdate: Date;
}

// WebSocket 数据状态
export type WebSocketDataState = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'simulated';

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}

// 工具类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type AnyFunction<T = any> = (...args: any[]) => T;

export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
EOF

# 创建 README.md
cat > packages/core/types/README.md << 'EOF'
# @yyc3/types

YYC³ 类型定义包。

## 安装

\`\`\`bash
pnpm add @yyc3/types
\`\`\`

## 使用

\`\`\`typescript
import type { ButtonProps, User, NodeData } from '@yyc3/types';

const buttonProps: ButtonProps = {
  variant: 'default',
  size: 'lg',
};

const user: User = {
  id: '1',
  email: 'user@example.com',
  name: 'User',
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
};
\`\`\`

## 许可证

MIT © YanYuCloudCube Team
EOF

echo "✅ @yyc3/types 包创建完成！"
```

### 2. 创建 @yyc3/ui

```bash
#!/bin/bash
# create-ui-package.sh

set -e

echo "🎨 创建 @yyc3/ui 包..."

# 创建目录结构
mkdir -p packages/core/ui/src/{components,styles,utils}
mkdir -p packages/core/ui/__tests__

# 创建 package.json
cat > packages/core/ui/package.json << 'EOF'
{
  "name": "@yyc3/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./button": "./src/components/button.tsx",
    "./card": "./src/components/card.tsx",
    "./input": "./src/components/input.tsx"
  },
  "files": ["src"],
  "scripts": {
    "build": "vite build",
    "test": "vitest",
    "lint": "eslint src"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.2.4",
    "@yyc3/types": "workspace:*",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.9.0",
    "vite": "^7.3.1",
    "vitest": "^3.0.0"
  },
  "keywords": ["yyc3", "ui", "components", "radix-ui"],
  "author": "YanYuCloudCube Team <admin@0379.email>",
  "license": "MIT"
}
EOF

# 创建 tsconfig.json
cat > packages/core/ui/tsconfig.json << 'EOF'
{
  "extends": "../../../tools/configs/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src", "__tests__"],
  "exclude": ["node_modules", "dist"]
}
EOF

# 创建 vite.config.ts
cat > packages/core/ui/vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'YYC3UI',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
});
EOF

# 创建 utils/cn.ts
cat > packages/core/ui/src/utils/cn.ts << 'EOF'
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF

# 创建 Button 组件
cat > packages/core/ui/src/components/button.tsx << 'EOF'
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import type { ButtonProps } from "@yyc3/types";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border bg-background text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <span className="animate-spin">⏳</span> : children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
EOF

# 创建 Card 组件
cat > packages/core/ui/src/components/card.tsx << 'EOF'
import * as React from "react";
import { cn } from "../utils/cn";
import type { CardProps } from "@yyc3/types";

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("bg-card text-card-foreground rounded-xl border", className)}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
  }
);

CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <h4 ref={ref} className={cn("text-lg font-semibold", className)} {...props} />;
  }
);

CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />;
  }
);

CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;
  }
);

CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />;
  }
);

CardFooter.displayName = "CardFooter";
EOF

# 创建主入口
cat > packages/core/ui/src/index.ts << 'EOF'
export { Button, buttonVariants } from './components/button';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/card';
export { cn } from './utils/cn';
EOF

# 创建 README.md
cat > packages/core/ui/README.md << 'EOF'
# @yyc3/ui

YYC³ UI 组件库。

## 安装

\`\`\`bash
pnpm add @yyc3/ui
\`\`\`

## 使用

\`\`\`tsx
import { Button, Card } from '@yyc3/ui';

function App() {
  return (
    <Card>
      <Button variant="default">Click me</Button>
    </Card>
  );
}
\`\`\`

## 组件

- Button - 按钮组件
- Card - 卡片组件

## 许可证

MIT © YanYuCloudCube Team
EOF

echo "✅ @yyc3/ui 包创建完成！"
```

### 3. 创建 @yyc3/hooks

```bash
#!/bin/bash
# create-hooks-package.sh

set -e

echo "🪝 创建 @yyc3/hooks 包..."

# 创建目录结构
mkdir -p packages/core/hooks/src
mkdir -p packages/core/hooks/__tests__

# 创建 package.json
cat > packages/core/hooks/package.json << 'EOF'
{
  "name": "@yyc3/hooks",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./useLocalStorage": "./src/useLocalStorage.ts",
    "./useDebounce": "./src/useDebounce.ts"
  },
  "files": ["src"],
  "scripts": {
    "test": "vitest",
    "lint": "eslint src"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@yyc3/types": "workspace:*"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.9.0",
    "vitest": "^3.0.0"
  },
  "keywords": ["yyc3", "hooks", "react"],
  "author": "YanYuCloudCube Team <admin@0379.email>",
  "license": "MIT"
}
EOF

# 创建 useLocalStorage.ts
cat > packages/core/hooks/src/useLocalStorage.ts << 'EOF'
import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);
  
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);
  
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);
  
  return [storedValue, setValue, removeValue];
}
EOF

# 创建 useDebounce.ts
cat > packages/core/hooks/src/useDebounce.ts << 'EOF'
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}
EOF

# 创建主入口
cat > packages/core/hooks/src/index.ts << 'EOF'
export { useLocalStorage } from './useLocalStorage';
export { useDebounce } from './useDebounce';
EOF

# 创建 README.md
cat > packages/core/hooks/README.md << 'EOF'
# @yyc3/hooks

YYC³ React Hooks 库。

## 安装

\`\`\`bash
pnpm add @yyc3/hooks
\`\`\`

## 使用

\`\`\`tsx
import { useLocalStorage, useDebounce } from '@yyc3/hooks';

function App() {
  const [value, setValue] = useLocalStorage('key', 'default');
  const debouncedValue = useDebounce(value, 300);
  
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
\`\`\`

## Hooks

- useLocalStorage - 本地存储 Hook
- useDebounce - 防抖 Hook

## 许可证

MIT © YanYuCloudCube Team
EOF

echo "✅ @yyc3/hooks 包创建完成！"
```

---

## 🔧 常用命令

### 开发命令

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 构建特定包
pnpm --filter @yyc3/ui build

# 运行测试
pnpm test

# 运行特定包测试
pnpm --filter @yyc3/ui test

# 代码检查
pnpm lint

# 启动开发服务器
pnpm dev

# 清理构建产物
pnpm clean
```

### Turborepo 命令

```bash
# 查看任务依赖图
turbo run build --dry=json

# 强制重新构建
turbo run build --force

# 并行运行任务
turbo run test lint --parallel

# 过滤特定包
turbo run build --filter=@yyc3/ui

# 只运行有变化的包
turbo run build --since=main
```

### pnpm 命令

```bash
# 添加依赖到特定包
pnpm --filter @yyc3/ui add lodash

# 添加开发依赖到特定包
pnpm --filter @yyc3/ui add -D @types/lodash

# 添加依赖到 workspace 根目录
pnpm add -w typescript

# 更新依赖
pnpm update

# 检查过期依赖
pnpm outdated

# 检查安全漏洞
pnpm audit
```

---

## 📝 常见问题

### 1. 如何添加新包？

```bash
# 创建包目录
mkdir -p packages/core/new-package/src

# 创建 package.json
cat > packages/core/new-package/package.json << 'EOF'
{
  "name": "@yyc3/new-package",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": ["src"]
}
EOF

# 创建 tsconfig.json
cat > packages/core/new-package/tsconfig.json << 'EOF'
{
  "extends": "../../../tools/configs/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
EOF

# 创建入口文件
cat > packages/core/new-package/src/index.ts << 'EOF'
export const hello = 'world';
EOF

# 安装依赖
pnpm install
```

### 2. 如何引用其他包？

```typescript
// 在 package.json 中添加依赖
{
  "dependencies": {
    "@yyc3/types": "workspace:*"
  }
}

// 在代码中引用
import type { ButtonProps } from '@yyc3/types';
```

### 3. 如何发布包？

```bash
# 使用 Changesets
pnpm changeset

# 版本升级
pnpm changeset version

# 发布到 npm
pnpm changeset publish
```

### 4. 如何处理循环依赖？

```bash
# 检查循环依赖
npx madge --circular packages/

# 解决方案：
# 1. 重构代码，提取共享模块
# 2. 使用依赖注入
# 3. 使用事件总线
```

---

## 🎯 最佳实践

### 1. 包命名规范

```
@yyc3/{scope}-{name}

示例：
@yyc3/ui          - UI 组件
@yyc3/hooks       - React Hooks
@yyc3/types       - 类型定义
@yyc3/utils       - 工具函数
@yyc3/i18n        - 国际化
```

### 2. 版本管理

```
遵循语义化版本控制：
- MAJOR: 不兼容的 API 变更
- MINOR: 向后兼容的功能新增
- PATCH: 向后兼容的问题修复
```

### 3. 文档规范

```
每个包必须包含：
- README.md - 包说明文档
- CHANGELOG.md - 变更记录
- LICENSE - 许可证
- src/index.ts - 主入口
```

### 4. 测试规范

```
- 单元测试覆盖率 >= 80%
- 集成测试覆盖核心流程
- E2E 测试覆盖关键路径
```

---

## 📚 参考资料

- [pnpm Workspace](https://pnpm.io/workspaces)
- [Turborepo](https://turbo.build/repo/docs)
- [Changesets](https://github.com/changesets/changesets)
- [语义化版本控制](https://semver.org/)

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-08  
**维护团队**: YanYuCloudCube Team  
**联系方式**: admin@0379.email
