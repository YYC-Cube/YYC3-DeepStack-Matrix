# YYC³ 极光风格前端UI/UX原型开发设计提示词

---

## 🎨 品牌元素自定义

### 可自定义的品牌元素

YYC³ AI Code 支持以下品牌元素的完全自定义，用户可以通过设置界面或配置文件进行修改：

#### 1. Logo（标志）

- **文件格式**: SVG, PNG, WebP
- **推荐尺寸**: 32x32, 64x64, 128x128, 256x256
- **透明背景**: 支持
- **动画效果**: 支持旋转、浮动等CSS动画
- **配置路径**: `src/config/branding.ts` 或设置界面

#### 2. 标语（Slogan）

- **中文标语**: "言启象限 | 语枢未来"
- **英文标语**: "Words Initiate Quadrants, Language Serves as Core for Future"
- **副标语中文**: "万象归元于云枢 | 深栈智启新纪元"
- **副标语英文**: "All things converge in cloud pivot; Deep stacks ignite a new era of intelligence"
- **显示位置**: 首页、登录页、关于页面
- **自定义方式**: 设置界面 → 品牌设置 → 标语编辑

#### 3. 页面标题

- **SEO 标题**: 可自定义，默认 "YYC³ AI Code Designer"
- **SEO 描述**: 可自定义，支持多语言
- **浏览器标签**: 支持自定义图标和标题
- **配置方式**: `src/config/seo.ts` 或设置界面

#### 4. 联系信息

- **邮箱**: <admin@0379.email>（可自定义）
- **官网**: 可自定义URL
- **社交媒体**: 支持添加多个社交链接
- **版权信息**: 可自定义版权年份和所有者

### 实现方式

#### TypeScript 配置文件

```typescript
// src/config/branding.ts
export interface BrandingConfig {
  // Logo 配置
  logo: {
    light: string;  // 浅色模式 logo 路径
    dark: string;   // 深色模式 logo 路径
    width: number;
    height: number;
    animated?: boolean;
  };

  // 标语配置
  slogan: {
    primary: {
      zh: string;  // 主标语中文
      en: string;  // 主标语英文
    };
    secondary: {
      zh: string;  // 副标语中文
      en: string;  // 副标语英文
    };
  };

  // 页面标题配置
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };

  // 联系信息
  contact: {
    email: string;
    website?: string;
    social?: {
      github?: string;
      twitter?: string;
      linkedin?: string;
    };
  };

  // 版权信息
  copyright: {
    year: number;
    owner: string;
    license?: string;
  };
}

export const defaultBranding: BrandingConfig = {
  logo: {
    light: '/assets/logo-light.svg',
    dark: '/assets/logo-dark.svg',
    width: 40,
    height: 40,
    animated: true,
  },
  slogan: {
    primary: {
      zh: '言启象限 | 语枢未来',
      en: 'Words Initiate Quadrants, Language Serves as Core for Future',
    },
    secondary: {
      zh: '万象归元于云枢 | 深栈智启新纪元',
      en: 'All things converge in cloud pivot; Deep stacks ignite a new era of intelligence',
    },
  },
  seo: {
    title: 'YYC³ AI Code Designer',
    description: '智能AI代码设计器，支持实时协作、多设备预览、AI辅助开发',
    keywords: ['AI', 'Code', 'Designer', 'Collaboration', 'Real-time'],
  },
  contact: {
    email: 'admin@0379.email',
    website: 'https://yanyucloudcube.com',
  },
  copyright: {
    year: new Date().getFullYear(),
    owner: 'YanYuCloudCube Team',
    license: 'MIT',
  },
};
```

#### React 组件实现

```tsx
// src/components/branding/Logo.tsx
import React from 'react';
import { useBranding } from '@/hooks/useBranding';

export const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const { branding } = useBranding();
  const { logo } = branding;

  const sizes = {
    sm: { width: 24, height: 24 },
    md: { width: 40, height: 40 },
    lg: { width: 64, height: 64 },
  };

  const sizeProps = sizes[size];

  return (
    <img
      src={logo.light}
      alt={branding.seo.title}
      width={sizeProps.width}
      height={sizeProps.height}
      className={`logo logo-${size} ${logo.animated ? 'logo-animated' : ''}`}
      style={{
        animation: logo.animated ? 'logoFloat 3s ease-in-out infinite' : undefined,
      }}
    />
  );
};

// src/components/branding/Slogan.tsx
import React from 'react';
import { useBranding } from '@/hooks/useBranding';
import { useLanguage } from '@/hooks/useLanguage';

export const Slogan: React.FC = () => {
  const { branding } = useBranding();
  const { language } = useLanguage();
  const { slogan } = branding;

  const currentSlogan = language === 'zh' ? slogan.primary.zh : slogan.primary.en;
  const currentSecondary = language === 'zh' ? slogan.secondary.zh : slogan.secondary.en;

  return (
    <div className="slogan-container">
      <h1 className="slogan-primary">{currentSlogan}</h1>
      <p className="slogan-secondary">{currentSecondary}</p>
    </div>
  );
};

// src/components/branding/BrandingSettings.tsx
import React, { useState } from 'react';
import { useBranding, useUpdateBranding } from '@/hooks/useBranding';

export const BrandingSettings: React.FC = () => {
  const { branding } = useBranding();
  const updateBranding = useUpdateBranding();
  const [editing, setEditing] = useState(false);

  const handleSave = async (newBranding: BrandingConfig) => {
    await updateBranding(newBranding);
    setEditing(false);
  };

  return (
    <div className="branding-settings">
      <h2>品牌设置</h2>

      {/* Logo 上传 */}
      <div className="setting-group">
        <label>Logo</label>
        <input
          type="file"
          accept="image/svg+xml,image/png,image/webp"
          onChange={(e) => handleLogoUpload(e)}
        />
        <img src={branding.logo.light} alt="Logo preview" />
      </div>

      {/* 标语编辑 */}
      <div className="setting-group">
        <label>主标语（中文）</label>
        <input
          type="text"
          value={branding.slogan.primary.zh}
          onChange={(e) => handleSloganChange('primary', 'zh', e.target.value)}
        />
      </div>

      <div className="setting-group">
        <label>主标语（英文）</label>
        <input
          type="text"
          value={branding.slogan.primary.en}
          onChange={(e) => handleSloganChange('primary', 'en', e.target.value)}
        />
      </div>

      {/* 页面标题 */}
      <div className="setting-group">
        <label>页面标题</label>
        <input
          type="text"
          value={branding.seo.title}
          onChange={(e) => handleSeoChange('title', e.target.value)}
        />
      </div>

      <button onClick={() => handleSave(branding)}>保存更改</button>
    </div>
  );
};
```

#### Zustand Store

```typescript
// src/stores/brandingStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BrandingConfig, defaultBranding } from '@/config/branding';

interface BrandingStore {
  branding: BrandingConfig;
  updateBranding: (branding: BrandingConfig) => void;
  resetBranding: () => void;
}

export const useBrandingStore = create<BrandingStore>()(
  persist(
    (set) => ({
      branding: defaultBranding,
      updateBranding: (branding) => set({ branding }),
      resetBranding: () => set({ branding: defaultBranding }),
    }),
    {
      name: 'yyc3-branding',
    }
  )
);

export const useBranding = () => useBrandingStore((state) => state.branding);
export const useUpdateBranding = () => useBrandingStore((state) => state.updateBranding);
```

### 使用说明

#### 1. 通过设置界面修改

1. 打开应用设置
2. 进入"品牌设置"页面
3. 上传自定义Logo
4. 编辑标语文本
5. 修改页面标题和描述
6. 点击"保存更改"

#### 2. 通过配置文件修改

1. 编辑 `src/config/branding.ts`
2. 修改相应的配置项
3. 重启应用或刷新页面

#### 3. 实时预览

- 所有修改支持实时预览
- 修改后立即在界面中显示效果
- 支持对比模式查看修改前后效果

---

## 📋 目录导航

1. [风格概述](#-风格概述)
2. [设计原则](#-设计原则)
3. [视觉系统](#-视觉系统)
4. [组件规范](#-组件规范)
5. [交互设计](#-交互设计)
6. [开发指导](#-开发指导)
7. [技术实现](#-技术实现)
8. [最佳实践](#-最佳实践)

---

## 🎨 风格概述

### 核心特征

极光风格是一种融合了**自然渐变**、**流动光影**、**清新通透**的设计风格，创造出自然、流动、清新的视觉体验。

#### 视觉特点

- **自然性**：模仿极光、彩虹等自然现象，清新配色
- **流动性**：背景渐变缓慢流动变化，光影自然移动
- **通透性**：半透明效果，光线穿透，清新视觉

#### 情感体验

- **清新**：清新自然的色彩组合，带来舒适感
- **流动**：渐变流动和光影移动带来生命力
- **自然**：模仿自然现象，营造和谐氛围

### 适用场景

- **健康应用**：健身、医疗、健康监测、健康管理
- **环保应用**：环保、可持续发展、绿色生活、生态保护
- **生活应用**：社交、娱乐、生活方式、个人成长

---

## 🎯 设计原则

### 1. 自然性原则

#### 自然渐变

```css
/* 线性极光渐变 */
.aurora-linear {
  background: linear-gradient(135deg, #00ff87 0%, #60efff 50%, #ff6b6b 100%);
  background-size: 200% 200%;
  animation: aurora-flow 15s ease infinite;
}

@keyframes aurora-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

#### 径向极光

```css
/* 径向极光渐变 */
.aurora-radial {
  background: radial-gradient(circle at center, #00ff87 0%, #60efff 50%, #ff6b6b 100%);
  background-size: 200% 200%;
  animation: aurora-pulse 10s ease-in-out infinite;
}

@keyframes aurora-pulse {
  0%, 100% { background-size: 200% 200%; }
  50% { background-size: 250% 250%; }
}
```

### 2. 流动性原则

#### 渐变流动

```css
/* 渐变流动背景 */
.gradient-flow {
  background:
    linear-gradient(135deg, #00ff87 0%, #60efff 25%, #ff6b6b 50%, #a855f7 75%, #00ff87 100%);
  background-size: 400% 400%;
  animation: gradientMove 20s ease infinite;
}

@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  25% { background-position: 100% 50%; }
  50% { background-position: 100% 100%; }
  75% { background-position: 0% 100%; }
  100% { background-position: 0% 50%; }
}
```

#### 光影移动

```css
/* 光影移动效果 */
.light-move {
  position: relative;
  overflow: hidden;
}

.light-move::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  animation: lightRotate 10s linear infinite;
}

@keyframes lightRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### 3. 通透性原则

#### 半透明效果

```css
/* 半透明卡片 */
.card-translucent {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

#### 光影穿透

```css
/* 光影穿透效果 */
.light-penetrate {
  position: relative;
  overflow: hidden;
}

.light-penetrate::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(0, 255, 135, 0.1) 0%,
    rgba(96, 239, 255, 0.1) 50%,
    rgba(255, 107, 107, 0.1) 100%
  );
  pointer-events: none;
  animation: lightShift 8s ease-in-out infinite;
}

@keyframes lightShift {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
```

---

## 🎨 视觉系统

### 色彩系统

#### 主色调

```css
:root {
  --aurora-green: #00ff87;
  --aurora-cyan: #60efff;
  --aurora-red: #ff6b6b;
  --aurora-purple: #a855f7;
  --aurora-pink: #ec4899;
  --aurora-yellow: #fbbf24;
}
```

#### 渐变色系

```css
/* 绿青渐变 */
.gradient-green-cyan {
  background: linear-gradient(135deg, #00ff87 0%, #60efff 100%);
}

/* 红紫渐变 */
.gradient-red-purple {
  background: linear-gradient(135deg, #ff6b6b 0%, #a855f7 100%);
}

/* 粉黄渐变 */
.gradient-pink-yellow {
  background: linear-gradient(135deg, #ec4899 0%, #fbbf24 100%);
}

/* 多色渐变 */
.gradient-multi {
  background: linear-gradient(135deg, #00ff87 0%, #60efff 25%, #ff6b6b 50%, #a855f7 75%, #ec4899 100%);
}
```

### 字体系统

#### 字体家族

```css
:root {
  --font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --font-secondary: 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'SF Mono', 'Monaco', 'Consolas', 'Courier New', monospace;
}
```

#### 字体大小

```css
:root {
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 32px;
}
```

### 间距系统

#### 基础间距

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

### 圆角系统

#### 圆角规范

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
}
```

---

## 🧩 组件规范

### 1. 卡片组件

#### 透明卡片

```css
.card-translucent {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.card-translucent:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}
```

#### 渐变卡片

```css
.card-gradient {
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.8) 0%, rgba(96, 239, 255, 0.8) 100%);
  backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 24px;
  color: white;
  box-shadow: 0 8px 32px rgba(0, 255, 135, 0.3);
  transition: all 0.3s ease;
}

.card-gradient:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 255, 135, 0.4);
}
```

### 2. 按钮组件

#### 渐变按钮

```css
.button-gradient {
  background: linear-gradient(135deg, #00ff87 0%, #60efff 100%);
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 255, 135, 0.3);
}

.button-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 255, 135, 0.4);
}

.button-gradient:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 255, 135, 0.3);
}
```

#### 透明按钮

```css
.button-translucent {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 12px 24px;
  color: #374151;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.button-translucent:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### 3. 输入框组件

#### 透明输入框

```css
.input-translucent {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  color: #374151;
  font-size: 16px;
  transition: all 0.3s ease;
  outline: none;
}

.input-translucent:focus {
  border-color: #00ff87;
  box-shadow: 0 0 0 3px rgba(0, 255, 135, 0.1);
  background: rgba(255, 255, 255, 0.8);
}

.input-translucent::placeholder {
  color: #9ca3af;
}
```

### 4. 导航组件

#### 透明导航栏

```css
.nav-translucent {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-item-translucent {
  background: transparent;
  border: none;
  color: #6b7280;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.nav-item-translucent:hover {
  background: rgba(255, 255, 255, 0.8);
  color: #374151;
}

.nav-item-translucent.active {
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.2) 0%, rgba(96, 239, 255, 0.2) 100%);
  color: #00ff87;
}
```

---

## ✨ 交互设计

### 1. 悬停效果

#### 卡片悬停

```css
.card-translucent {
  transition: all 0.3s ease;
}

.card-translucent:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}
```

#### 按钮悬停

```css
.button-gradient {
  transition: all 0.3s ease;
}

.button-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 255, 135, 0.4);
}
```

### 2. 点击效果

#### 按钮点击

```css
.button-gradient:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0, 255, 135, 0.3);
}
```

### 3. 过渡动画

#### 页面切换

```css
.page-transition {
  animation: pageFadeIn 0.5s ease-out;
}

@keyframes pageFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### 元素进入

```css
.element-enter {
  animation: elementSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes elementSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 💻 开发指导

### 1. 技术栈推荐

#### 前端框架

```json
{
  "framework": "React 18+",
  "language": "TypeScript",
  "styling": "Tailwind CSS + CSS Modules",
  "state": "Zustand",
  "router": "React Router v6"
}
```

#### UI组件库

```json
{
  "base": "Radix UI",
  "animations": "Framer Motion",
  "icons": "Lucide React",
  "forms": "React Hook Form"
}
```

### 2. 项目结构

```
src/
├── components/
│   ├── aurora/
│   │   ├── TranslucentCard.tsx
│   │   ├── GradientCard.tsx
│   │   ├── GradientButton.tsx
│   │   └── LightEffect.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── common/
│       ├── Loading.tsx
│       └── Error.tsx
├── styles/
│   ├── aurora.css
│   ├── gradient.css
│   └── variables.css
├── hooks/
│   ├── useAuroraEffect.ts
│   └── useLightAnimation.ts
└── utils/
    ├── color.ts
    └── animation.ts
```

### 3. 性能优化

#### 懒加载

```typescript
const LazyTranslucentCard = React.lazy(() => import('./components/aurora/TranslucentCard'));

const App = () => {
  return (
    <React.Suspense fallback={<Loading />}>
      <LazyTranslucentCard />
    </React.Suspense>
  );
};
```

#### 虚拟滚动

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualList = ({ items }: { items: any[] }) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
  });

  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TranslucentCard item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🔧 技术实现

### 1. React组件实现

#### 透明卡片组件

```typescript
import React from 'react';

interface TranslucentCardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export const TranslucentCard: React.FC<TranslucentCardProps> = ({
  children,
  className = '',
  gradient = false,
}) => {
  return (
    <div
      className={`card-translucent ${gradient ? 'card-gradient' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
```

#### 光影效果组件

```typescript
import React, { useEffect, useRef } from 'react';

interface LightEffectProps {
  children: React.ReactNode;
  className?: string;
}

export const LightEffect: React.FC<LightEffectProps> = ({
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 创建光影移动效果
    const createLightEffect = () => {
      const light = document.createElement('div');
      light.className = 'light-move';
      container.appendChild(light);
    };

    createLightEffect();

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div ref={containerRef} className={`light-penetrate ${className}`}>
      {children}
    </div>
  );
};
```

### 2. 自定义Hooks

#### 极光效果Hook

```typescript
import { useEffect, useRef } from 'react';

export const useAuroraEffect = (enabled: boolean = true) => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;

    // 添加极光渐变效果
    const addAuroraEffect = () => {
      element.style.background = 'linear-gradient(135deg, #00ff87 0%, #60efff 50%, #ff6b6b 100%)';
      element.style.backgroundSize = '200% 200%';
      element.style.animation = 'aurora-flow 15s ease infinite';
    };

    addAuroraEffect();

    return () => {
      element.style.background = '';
      element.style.backgroundSize = '';
      element.style.animation = '';
    };
  }, [enabled]);

  return elementRef;
};
```

#### 光影动画Hook

```typescript
import { useEffect, useState } from 'react';

export const useLightAnimation = () => {
  const [lights, setLights] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    // 生成随机光影
    const newLights = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 100 + Math.random() * 200,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 4,
    }));

    setLights(newLights);
  }, []);

  return lights;
};
```

---

## 📚 最佳实践

### 1. 性能优化

#### 减少重绘

```css
/* 使用transform代替top/left */
.card-translucent {
  transform: translateY(0);
  transition: transform 0.3s ease;
}

.card-translucent:hover {
  transform: translateY(-4px);
}
```

#### 使用will-change

```css
/* 提示浏览器优化 */
.card-translucent {
  will-change: transform, opacity, box-shadow;
}

.gradient-flow {
  will-change: background-position;
}
```

### 2. 可访问性

#### ARIA属性

```tsx
<div
  className="card-translucent"
  role="article"
  aria-label="透明卡片"
>
  <h2>卡片标题</h2>
  <p>卡片内容</p>
</div>
```

#### 键盘导航

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Tab':
      e.preventDefault();
      focusNextElement();
      break;
    case 'Enter':
    case ' ':
      activateElement();
      break;
    case 'Escape':
      closeDropdown();
      break;
  }
};
```

### 3. 响应式设计

#### 移动端适配

```css
@media (max-width: 768px) {
  .card-translucent {
    padding: 16px;
    border-radius: 12px;
  }

  .gradient-flow {
    animation-duration: 30s;
  }
}
```

#### 桌面端适配

```css
@media (min-width: 1024px) {
  .card-translucent {
    padding: 24px;
    border-radius: 16px;
  }

  .gradient-flow {
    animation-duration: 20s;
  }
}
```

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>
