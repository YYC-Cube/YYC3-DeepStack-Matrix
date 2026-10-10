---
file: YYC3-COMPONENT-ARCHITECTURE-DESIGN.md
description: YYC³ 组件库架构设计详解
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-04-08
updated: 2026-04-08
status: active
tags: [架构设计],[组件库],[Monorepo],[技术方案]
category: technical
language: zh-CN
audience: architects, senior developers
complexity: advanced
---

# YYC³ 组件库架构设计详解

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

## 📐 架构设计原则

### 1. 核心原则

#### 1.1 单一职责原则 (SRP)
每个组件包只负责一个明确的功能领域，避免职责混乱。

```
✅ 正确示例：
@yyc3/ui          → UI 组件渲染
@yyc3/hooks       → React Hooks 逻辑
@yyc3/utils       → 工具函数
@yyc3/types       → 类型定义

❌ 错误示例：
@yyc3/common      → 包含 UI、Hooks、Utils 所有内容
```

#### 1.2 依赖倒置原则 (DIP)
高层模块不依赖低层模块，两者都依赖抽象。

```typescript
// ✅ 正确：依赖抽象类型
import type { ButtonProps } from '@yyc3/types';
export function Button(props: ButtonProps) { ... }

// ❌ 错误：依赖具体实现
import { ThemeContext } from './theme-context';
export function Button(props: any) { ... }
```

#### 1.3 接口隔离原则 (ISP)
客户端不应该依赖它不需要的接口。

```typescript
// ✅ 正确：按需导入
import { Button } from '@yyc3/ui/button';
import { Card } from '@yyc3/ui/card';

// ❌ 错误：导入整个库
import { Button, Card, Input, ... } from '@yyc3/ui';
```

#### 1.4 开闭原则 (OCP)
对扩展开放，对修改关闭。

```typescript
// ✅ 正确：通过组合扩展
<Button variant="custom" className="my-custom-button">
  Custom Button
</Button>

// ❌ 错误：修改组件源码
// 直接修改 button.tsx 添加新功能
```

### 2. 架构分层

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  (CloudPivot, AI Family - 业务应用层)                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Component Layer                       │
│  (@yyc3/ui - UI 组件层)                                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Logic Layer                           │
│  (@yyc3/hooks - 逻辑层)                                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Foundation Layer                      │
│  (@yyc3/types, @yyc3/utils, @yyc3/i18n - 基础层)        │
└─────────────────────────────────────────────────────────┘
```

---

## 🏛️ 核心包设计

### 1. @yyc3/types - 类型定义包

#### 1.1 包结构

```
@yyc3/types/
├── src/
│   ├── index.ts              # 主入口
│   ├── api.ts                # API 相关类型
│   ├── models.ts             # 数据模型类型
│   ├── components.ts         # 组件 Props 类型
│   ├── hooks.ts              # Hooks 类型
│   ├── utils.ts              # 工具类型
│   └── vendor.d.ts           # 第三方库类型扩展
├── package.json
├── tsconfig.json
└── README.md
```

#### 1.2 类型定义示例

```typescript
// src/components.ts

/**
 * Button 组件 Props
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 按钮变体
   * @default 'default'
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  
  /**
   * 按钮尺寸
   * @default 'default'
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /**
   * 是否作为子组件渲染
   * @default false
   */
  asChild?: boolean;
  
  /**
   * 加载状态
   * @default false
   */
  loading?: boolean;
  
  /**
   * 禁用状态
   * @default false
   */
  disabled?: boolean;
}

/**
 * Card 组件 Props
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 卡片变体
   * @default 'default'
   */
  variant?: 'default' | 'outline' | 'ghost';
  
  /**
   * 卡片尺寸
   * @default 'default'
   */
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Input 组件 Props
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * 输入框变体
   * @default 'default'
   */
  variant?: 'default' | 'error' | 'success';
  
  /**
   * 输入框尺寸
   * @default 'default'
   */
  size?: 'default' | 'sm' | 'lg';
  
  /**
   * 左侧图标
   */
  leftIcon?: React.ReactNode;
  
  /**
   * 右侧图标
   */
  rightIcon?: React.ReactNode;
  
  /**
   * 错误信息
   */
  error?: string;
}

// src/models.ts

/**
 * 用户数据模型
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'developer' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 节点数据模型
 */
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

/**
 * WebSocket 数据状态
 */
export type WebSocketDataState = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'simulated';

// src/api.ts

/**
 * API 响应类型
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// src/utils.ts

/**
 * 深度部分类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 必需属性类型
 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 可选属性类型
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 函数类型
 */
export type AnyFunction<T = any> = (...args: any[]) => T;

/**
 * 异步函数类型
 */
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
```

#### 1.3 package.json

```json
{
  "name": "@yyc3/types",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./api": "./src/api.ts",
    "./models": "./src/models.ts",
    "./components": "./src/components.ts",
    "./hooks": "./src/hooks.ts",
    "./utils": "./src/utils.ts"
  },
  "files": ["src"],
  "keywords": ["yyc3", "types", "typescript"],
  "author": "YanYuCloudCube Team <admin@0379.email>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/YanYuCloudCube/YYC3-CloudPivot-Intelli-Matrix.git",
    "directory": "packages/core/types"
  }
}
```

---

### 2. @yyc3/ui - UI 组件包

#### 2.1 包结构

```
@yyc3/ui/
├── src/
│   ├── components/           # 组件目录
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   ├── styles/               # 样式目录
│   │   ├── theme.css         # 主题变量
│   │   ├── variables.css     # CSS 变量
│   │   └── globals.css       # 全局样式
│   ├── utils/                # 工具函数
│   │   └── cn.ts             # classnames 工具
│   └── index.ts              # 主入口
├── stories/                  # Storybook stories
│   ├── Button.stories.tsx
│   ├── Card.stories.tsx
│   └── ...
├── __tests__/                # 测试文件
│   ├── button.test.tsx
│   ├── card.test.tsx
│   └── ...
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

#### 2.2 组件设计示例

```typescript
// src/components/button.tsx

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";
import type { ButtonProps } from "@yyc3/types";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Button 组件
 * 
 * @example
 * ```tsx
 * <Button variant="default">默认按钮</Button>
 * <Button variant="destructive">危险按钮</Button>
 * <Button size="sm">小按钮</Button>
 * <Button loading>加载中</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
```

```typescript
// src/components/card.tsx

import * as React from "react";
import { cn } from "../utils/cn";
import type { CardProps } from "@yyc3/types";

/**
 * Card 组件
 * 
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>标题</CardTitle>
 *     <CardDescription>描述</CardDescription>
 *   </CardHeader>
 *   <CardContent>内容</CardContent>
 *   <CardFooter>底部</CardFooter>
 * </Card>
 * ```
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="card"
        className={cn(
          "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
});

CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <h4
      ref={ref}
      data-slot="card-title"
      className={cn("leading-none", className)}
      {...props}
    />
  );
});

CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  );
});

CardDescription.displayName = "CardDescription";

export const CardAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
});

CardAction.displayName = "CardAction";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
});

CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
});

CardFooter.displayName = "CardFooter";
```

#### 2.3 样式系统

```css
/* src/styles/theme.css */

:root {
  /* 品牌色 */
  --yyc3-primary: 210 100% 50%;
  --yyc3-secondary: 220 14% 96%;
  --yyc3-accent: 210 40% 96%;
  
  /* 语义色 */
  --yyc3-success: 142 76% 36%;
  --yyc3-warning: 38 92% 50%;
  --yyc3-error: 0 84% 60%;
  --yyc3-info: 199 89% 48%;
  
  /* 中性色 */
  --yyc3-background: 0 0% 100%;
  --yyc3-foreground: 222 47% 11%;
  --yyc3-muted: 210 40% 96%;
  --yyc3-muted-foreground: 215 16% 47%;
  --yyc3-border: 214 32% 91%;
  --yyc3-input: 214 32% 91%;
  --yyc3-ring: 210 100% 50%;
  
  /* 组件色 */
  --yyc3-card: 0 0% 100%;
  --yyc3-card-foreground: 222 47% 11%;
  --yyc3-popover: 0 0% 100%;
  --yyc3-popover-foreground: 222 47% 11%;
  
  /* 间距 */
  --yyc3-spacing-xs: 0.25rem;
  --yyc3-spacing-sm: 0.5rem;
  --yyc3-spacing-md: 1rem;
  --yyc3-spacing-lg: 1.5rem;
  --yyc3-spacing-xl: 2rem;
  
  /* 圆角 */
  --yyc3-radius-sm: 0.25rem;
  --yyc3-radius-md: 0.375rem;
  --yyc3-radius-lg: 0.5rem;
  --yyc3-radius-xl: 0.75rem;
  --yyc3-radius-full: 9999px;
  
  /* 阴影 */
  --yyc3-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --yyc3-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --yyc3-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --yyc3-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  
  /* 动画 */
  --yyc3-duration-fast: 150ms;
  --yyc3-duration-normal: 300ms;
  --yyc3-duration-slow: 500ms;
  --yyc3-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

.dark {
  --yyc3-background: 222 47% 11%;
  --yyc3-foreground: 210 40% 98%;
  --yyc3-muted: 217 33% 17%;
  --yyc3-muted-foreground: 215 20% 65%;
  --yyc3-border: 217 33% 17%;
  --yyc3-input: 217 33% 17%;
  
  --yyc3-card: 222 47% 11%;
  --yyc3-card-foreground: 210 40% 98%;
  --yyc3-popover: 222 47% 11%;
  --yyc3-popover-foreground: 210 40% 98%;
}
```

#### 2.4 package.json

```json
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
    "./input": "./src/components/input.tsx",
    "./badge": "./src/components/badge.tsx",
    "./dialog": "./src/components/dialog.tsx",
    "./dropdown-menu": "./src/components/dropdown-menu.tsx",
    "./select": "./src/components/select.tsx",
    "./tabs": "./src/components/tabs.tsx",
    "./styles/theme.css": "./src/styles/theme.css",
    "./styles/variables.css": "./src/styles/variables.css",
    "./styles/globals.css": "./src/styles/globals.css"
  },
  "files": ["src", "dist"],
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.8",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-hover-card": "^1.1.15",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-menubar": "^1.1.16",
    "@radix-ui/react-navigation-menu": "^1.2.14",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-progress": "^1.1.8",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-toggle": "^1.1.10",
    "@radix-ui/react-toggle-group": "^1.1.11",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@yyc3/types": "workspace:*",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@storybook/react": "^8.0.0",
    "@storybook/react-vite": "^8.0.0",
    "@testing-library/react": "^14.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.0",
    "vite": "^7.3.1",
    "vitest": "^3.0.0"
  },
  "keywords": ["yyc3", "ui", "components", "radix-ui", "react"],
  "author": "YanYuCloudCube Team <admin@0379.email>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/YanYuCloudCube/YYC3-CloudPivot-Intelli-Matrix.git",
    "directory": "packages/core/ui"
  }
}
```

---

### 3. @yyc3/hooks - Hooks 包

#### 3.1 包结构

```
@yyc3/hooks/
├── src/
│   ├── useI18n.ts            # 国际化 Hook
│   ├── useWebSocket.ts       # WebSocket Hook
│   ├── useLocalStorage.ts    # 本地存储 Hook
│   ├── useDebounce.ts        # 防抖 Hook
│   ├── useThrottle.ts        # 节流 Hook
│   ├── useMediaQuery.ts      # 媒体查询 Hook
│   ├── useClickOutside.ts    # 点击外部检测 Hook
│   ├── useToggle.ts          # 布尔切换 Hook
│   ├── useWindowSize.ts      # 窗口尺寸 Hook
│   ├── useOnlineStatus.ts    # 在线状态 Hook
│   ├── usePrevious.ts        # 上一个值 Hook
│   ├── useIntersectionObserver.ts  # 交叉观察器 Hook
│   └── index.ts              # 主入口
├── __tests__/                # 测试文件
│   ├── useI18n.test.ts
│   ├── useWebSocket.test.ts
│   └── ...
├── package.json
├── tsconfig.json
└── README.md
```

#### 3.2 Hook 设计示例

```typescript
// src/useI18n.ts

import { useState, useCallback, useMemo } from 'react';
import type { I18nConfig, TranslationKey } from '@yyc3/types';

/**
 * 国际化 Hook
 * 
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useI18n();
 * 
 * return (
 *   <div>
 *     <h1>{t('welcome')}</h1>
 *     <button onClick={() => setLocale('en-US')}>English</button>
 *   </div>
 * );
 * ```
 */
export function useI18n(config?: I18nConfig) {
  const [locale, setLocale] = useState(config?.defaultLocale || 'zh-CN');
  
  const translations = useMemo(() => {
    return config?.translations?.[locale] || {};
  }, [locale, config?.translations]);
  
  const t = useCallback((key: TranslationKey, params?: Record<string, any>) => {
    let text = translations[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
      });
    }
    
    return text;
  }, [translations]);
  
  return {
    locale,
    setLocale,
    t,
    locales: config?.locales || ['zh-CN', 'en-US'],
  };
}
```

```typescript
// src/useWebSocket.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketOptions, WebSocketState } from '@yyc3/types';

/**
 * WebSocket Hook
 * 
 * @example
 * ```tsx
 * const { status, data, send, close } = useWebSocket('ws://localhost:8080');
 * 
 * useEffect(() => {
 *   if (data) {
 *     console.log('Received:', data);
 *   }
 * }, [data]);
 * 
 * return (
 *   <div>
 *     <p>Status: {status}</p>
 *     <button onClick={() => send('Hello')}>Send</button>
 *   </div>
 * );
 * ```
 */
export function useWebSocket(url: string, options?: WebSocketOptions) {
  const [state, setState] = useState<WebSocketState>({
    status: 'disconnected',
    data: null,
    error: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    setState(prev => ({ ...prev, status: 'connecting' }));
    
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setState(prev => ({ ...prev, status: 'connected', error: null }));
        reconnectAttemptsRef.current = 0;
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setState(prev => ({ ...prev, data }));
        } catch (error) {
          setState(prev => ({ ...prev, data: event.data }));
        }
      };
      
      ws.onerror = (error) => {
        setState(prev => ({ ...prev, error: error as Error }));
      };
      
      ws.onclose = () => {
        setState(prev => ({ ...prev, status: 'disconnected' }));
        
        if (options?.reconnect && reconnectAttemptsRef.current < (options.maxReconnectAttempts || 5)) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, options.reconnectInterval || 3000);
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
      setState(prev => ({ ...prev, status: 'disconnected', error: error as Error }));
    }
  }, [url, options]);
  
  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(message);
    }
  }, []);
  
  const close = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
  }, []);
  
  useEffect(() => {
    connect();
    
    return () => {
      close();
    };
  }, [connect, close]);
  
  return {
    ...state,
    send,
    close,
    reconnect: connect,
  };
}
```

```typescript
// src/useLocalStorage.ts

import { useState, useEffect, useCallback } from 'react';

/**
 * 本地存储 Hook
 * 
 * @example
 * ```tsx
 * const [value, setValue, removeValue] = useLocalStorage('key', 'default');
 * 
 * return (
 *   <div>
 *     <p>Value: {value}</p>
 *     <button onClick={() => setValue('new value')}>Set</button>
 *     <button onClick={removeValue}>Remove</button>
 *   </div>
 * );
 * ```
 */
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
```

#### 3.3 package.json

```json
{
  "name": "@yyc3/hooks",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./useI18n": "./src/useI18n.ts",
    "./useWebSocket": "./src/useWebSocket.ts",
    "./useLocalStorage": "./src/useLocalStorage.ts",
    "./useDebounce": "./src/useDebounce.ts",
    "./useThrottle": "./src/useThrottle.ts",
    "./useMediaQuery": "./src/useMediaQuery.ts",
    "./useClickOutside": "./src/useClickOutside.ts",
    "./useToggle": "./src/useToggle.ts",
    "./useWindowSize": "./src/useWindowSize.ts",
    "./useOnlineStatus": "./src/useOnlineStatus.ts",
    "./usePrevious": "./src/usePrevious.ts",
    "./useIntersectionObserver": "./src/useIntersectionObserver.ts"
  },
  "files": ["src"],
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix"
  },
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "dependencies": {
    "@yyc3/types": "workspace:*"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/react-hooks": "^8.0.1",
    "@types/react": "^19.0.0",
    "typescript": "^5.9.0",
    "vitest": "^3.0.0"
  },
  "keywords": ["yyc3", "hooks", "react"],
  "author": "YanYuCloudCube Team <admin@0379.email>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/YanYuCloudCube/YYC3-CloudPivot-Intelli-Matrix.git",
    "directory": "packages/core/hooks"
  }
}
```

---

## 🔧 构建配置

### 1. Vite 配置

```typescript
// packages/core/ui/vite.config.ts
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
```

### 2. TypeScript 配置

```json
// packages/core/ui/tsconfig.json
{
  "extends": "../../tools/configs/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"]
  },
  "include": ["src", "__tests__"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. Turborepo 配置

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "outputMode": "new-only"
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": [],
      "outputMode": "new-only"
    },
    "lint": {
      "outputs": [],
      "outputMode": "new-only"
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## 📚 文档规范

### 1. README 模板

```markdown
# @yyc3/{package-name}

> 简短描述

## 安装

\`\`\`bash
pnpm add @yyc3/{package-name}
\`\`\`

## 使用

\`\`\`tsx
import { Component } from '@yyc3/{package-name}';

function App() {
  return <Component />;
}
\`\`\`

## API

### Props

| 属性 | 类型 | 默认值 | 说明 |
|:---|:---|:---|:---|
| prop | type | default | description |

## 示例

[更多示例](./examples/)

## 贡献

欢迎贡献代码，请查看 [贡献指南](../../CONTRIBUTING.md)。

## 许可证

MIT © YanYuCloudCube Team
```

### 2. 组件文档模板

```markdown
# {ComponentName} 组件

## 概述

组件描述。

## 安装

\`\`\`bash
pnpm add @yyc3/ui
\`\`\`

## 使用

### 基础用法

\`\`\`tsx
import { Component } from '@yyc3/ui';

function App() {
  return <Component>Content</Component>;
}
\`\`\`

### 高级用法

\`\`\`tsx
import { Component } from '@yyc3/ui';

function App() {
  return (
    <Component variant="custom" size="lg">
      Advanced Usage
    </Component>
  );
}
\`\`\`

## Props

| 属性 | 类型 | 默认值 | 说明 |
|:---|:---|:---|:---|
| variant | string | 'default' | 变体 |
| size | string | 'default' | 尺寸 |

## 变体

### Default
默认样式。

### Custom
自定义样式。

## 最佳实践

1. 使用建议 1
2. 使用建议 2

## 无障碍

- 支持键盘导航
- 支持 ARIA 属性

## 相关组件

- [RelatedComponent1](./related-component-1.md)
- [RelatedComponent2](./related-component-2.md)
```

---

## 🎯 总结

本文档详细设计了 YYC³ 组件库的架构，包括：

1. **架构设计原则**：单一职责、依赖倒置、接口隔离、开闭原则
2. **核心包设计**：@yyc3/types、@yyc3/ui、@yyc3/hooks 的详细设计
3. **构建配置**：Vite、TypeScript、Turborepo 配置
4. **文档规范**：README 和组件文档模板

通过遵循这些设计原则和规范，可以建立一个高质量、可维护、可扩展的组件库。

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-08  
**维护团队**: YanYuCloudCube Team  
**联系方式**: admin@0379.email
