---
@file: 赛博朋克风格-前端UI-UX原型开发提示词.md
@description: YYC3-AI-Family 赛博朋克风格前端UI/UX原型开发设计提示词
@author: YanYuCloudCube Team
@version: 1.0.0
@created: 2026-03-07
@updated: 2026-03-07
@status: production
@tags: cyberpunk, ui-ux, frontend, prototype, design-prompt
---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元***
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

# 赛博朋克风格前端UI/UX原型开发设计提示词

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

赛博朋克风格是一种融合了**霓虹发光**、**科技感**、**未来主义**的视觉风格，创造出高对比度、强视觉冲击、未来感的体验。

#### 视觉特点

- **高对比度**：霓虹色彩配合深色背景，视觉冲击力强
- **科技元素**：电路板、网格、数据流、几何图形
- **动态效果**：脉冲发光、扫描线、数据流动

#### 情感体验

- **未来感**：强烈的未来主义氛围，科技感十足
- **冲击力**：高对比度和发光效果带来强烈视觉冲击
- **沉浸感**：深色背景配合动态效果营造沉浸式体验

### 适用场景

- **游戏界面**：科幻游戏、赛博朋克游戏、VR/AR应用
- **科技产品**：AI产品、区块链、加密货币、数据平台
- **创意应用**：音乐应用、视频编辑、艺术创作、媒体播放

---

## 🎯 设计原则

### 1. 高对比度原则

#### 霓虹发光

```css
/* 文本霓虹发光 */
.neon-text {
  color: #00f0ff;
  text-shadow:
    0 0 5px #00f0ff,
    0 0 10px #00f0ff,
    0 0 20px #00f0ff,
    0 0 40px #00f0ff,
    0 0 80px #00f0ff;
  animation: neon-pulse 2s ease-in-out infinite;
}

@keyframes neon-pulse {
  0%, 100% {
    text-shadow:
      0 0 5px #00f0ff,
      0 0 10px #00f0ff,
      0 0 20px #00f0ff,
      0 0 40px #00f0ff,
      0 0 80px #00f0ff;
  }
  50% {
    text-shadow:
      0 0 10px #00f0ff,
      0 0 20px #00f0ff,
      0 0 40px #00f0ff,
      0 0 80px #00f0ff,
      0 0 120px #00f0ff;
  }
}
```

#### 边框霓虹

```css
/* 边框霓虹发光 */
.neon-border {
  border: 2px solid #ff00ff;
  box-shadow:
    0 0 5px #ff00ff,
    0 0 10px #ff00ff,
    inset 0 0 5px #ff00ff;
  animation: neon-border-pulse 1.5s ease-in-out infinite;
}

@keyframes neon-border-pulse {
  0%, 100% {
    box-shadow:
      0 0 5px #ff00ff,
      0 0 10px #ff00ff,
      inset 0 0 5px #ff00ff;
  }
  50% {
    box-shadow:
      0 0 10px #ff00ff,
      0 0 20px #ff00ff,
      inset 0 0 10px #ff00ff;
  }
}
```

### 2. 科技感原则

#### 电路板效果

```css
/* 电路网格背景 */
.circuit-grid {
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  background-position: center center;
}

/* 电路连接线 */
.circuit-lines {
  position: relative;
  overflow: hidden;
}

.circuit-lines::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    linear-gradient(45deg, transparent 49%, rgba(0, 240, 255, 0.3) 50%, transparent 51%),
    linear-gradient(-45deg, transparent 49%, rgba(255, 0, 255, 0.3) 50%, transparent 51%);
  background-size: 40px 40px;
  animation: circuit-flow 20s linear infinite;
}

@keyframes circuit-flow {
  0% { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}
```

#### 数据流动效果

```css
/* 数据流背景 */
.data-flow {
  background:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 240, 255, 0.03) 2px,
      rgba(0, 240, 255, 0.03) 4px
    );
  animation: data-scroll 10s linear infinite;
}

@keyframes data-scroll {
  0% { background-position: 0 0; }
  100% { background-position: 0 100px; }
}
```

### 3. 动态性原则

#### 扫描线效果

```css
/* 水平扫描线 */
.scanlines {
  position: relative;
  overflow: hidden;
}

.scanlines::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
  animation: scanline-move 10s linear infinite;
}

@keyframes scanline-move {
  0% { background-position: 0 0; }
  100% { background-position: 0 100%; }
}
```

#### 全息投影效果

```css
/* 全息卡片 */
.hologram-card {
  background: linear-gradient(
    135deg,
    rgba(0, 240, 255, 0.1) 0%,
    rgba(0, 240, 255, 0.3) 50%,
    rgba(0, 240, 255, 0.1) 100%
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 240, 255, 0.5);
  box-shadow:
    0 0 20px rgba(0, 240, 255, 0.3),
    inset 0 0 20px rgba(0, 240, 255, 0.1);
  animation: hologram-flicker 0.1s infinite;
}

@keyframes hologram-flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.95; }
}
```

---

## 🎨 视觉系统

### 色彩系统

#### 主色调

```css
:root {
  --cyber-cyan: #00f0ff;
  --cyber-magenta: #ff00ff;
  --cyber-yellow: #ffff00;
  --cyber-green: #00ff00;
  --cyber-red: #ff0000;
  --cyber-blue: #0000ff;
}
```

#### 背景色系

```css
:root {
  --cyber-dark: #0a0a0a;
  --cyber-darker: #050505;
  --cyber-black: #000000;
  --cyber-gray: #1a1a1a;
}
```

#### 霓虹渐变

```css
/* 青紫渐变 */
.gradient-cyan-magenta {
  background: linear-gradient(135deg, #00f0ff 0%, #ff00ff 100%);
}

/* 黄绿渐变 */
.gradient-yellow-green {
  background: linear-gradient(135deg, #ffff00 0%, #00ff00 100%);
}

/* 红蓝渐变 */
.gradient-red-blue {
  background: linear-gradient(135deg, #ff0000 0%, #0000ff 100%);
}
```

### 字体系统

#### 字体家族

```css
:root {
  --font-primary: 'Orbitron', 'Rajdhani', 'Share Tech Mono', monospace;
  --font-secondary: 'Exo 2', 'Chakra Petch', sans-serif;
  --font-mono: 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
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
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
}
```

---

## 🧩 组件规范

### 1. 卡片组件

#### 霓虹卡片

```css
.card-neon {
  background: rgba(10, 10, 10, 0.8);
  border: 2px solid #00f0ff;
  border-radius: 8px;
  padding: 24px;
  box-shadow:
    0 0 10px #00f0ff,
    0 0 20px rgba(0, 240, 255, 0.3);
  transition: all 0.3s ease;
}

.card-neon:hover {
  box-shadow:
    0 0 20px #00f0ff,
    0 0 40px rgba(0, 240, 255, 0.5);
  transform: translateY(-4px);
}
```

#### 全息卡片

```css
.card-hologram {
  background: linear-gradient(
    135deg,
    rgba(0, 240, 255, 0.1) 0%,
    rgba(0, 240, 255, 0.3) 50%,
    rgba(0, 240, 255, 0.1) 100%
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 240, 255, 0.5);
  border-radius: 8px;
  padding: 24px;
  box-shadow:
    0 0 20px rgba(0, 240, 255, 0.3),
    inset 0 0 20px rgba(0, 240, 255, 0.1);
  animation: hologram-flicker 0.1s infinite;
}
```

### 2. 按钮组件

#### 霓虹按钮

```css
.button-neon {
  background: transparent;
  border: 2px solid #00f0ff;
  border-radius: 4px;
  padding: 12px 24px;
  color: #00f0ff;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow:
    0 0 10px #00f0ff,
    0 0 20px rgba(0, 240, 255, 0.3);
}

.button-neon:hover {
  background: #00f0ff;
  color: #0a0a0a;
  box-shadow:
    0 0 20px #00f0ff,
    0 0 40px rgba(0, 240, 255, 0.5);
  transform: translateY(-2px);
}

.button-neon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s;
}

.button-neon:hover::before {
  left: 100%;
}
```

#### 扫描按钮

```css
.button-scan {
  background: rgba(10, 10, 10, 0.8);
  border: 2px solid #ff00ff;
  border-radius: 4px;
  padding: 12px 24px;
  color: #ff00ff;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.button-scan::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(255, 0, 255, 0.1) 2px,
    rgba(255, 0, 255, 0.1) 4px
  );
  pointer-events: none;
  animation: scanline-move 2s linear infinite;
}
```

### 3. 输入框组件

#### 霓虹输入框

```css
.input-neon {
  background: rgba(10, 10, 10, 0.8);
  border: 2px solid rgba(0, 240, 255, 0.3);
  border-radius: 4px;
  padding: 12px 16px;
  color: #00f0ff;
  font-size: 16px;
  transition: all 0.3s ease;
  outline: none;
  font-family: 'Orbitron', monospace;
}

.input-neon:focus {
  border-color: #00f0ff;
  box-shadow:
    0 0 10px #00f0ff,
    0 0 20px rgba(0, 240, 255, 0.3),
    inset 0 0 10px rgba(0, 240, 255, 0.1);
  background: rgba(10, 10, 10, 0.9);
}

.input-neon::placeholder {
  color: rgba(0, 240, 255, 0.3);
}
```

### 4. 导航组件

#### 霓虹导航栏

```css
.nav-neon {
  background: rgba(10, 10, 10, 0.9);
  border-bottom: 2px solid #00f0ff;
  box-shadow:
    0 0 10px #00f0ff,
    0 0 20px rgba(0, 240, 255, 0.3);
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-item-neon {
  background: transparent;
  border: none;
  color: rgba(0, 240, 255, 0.7);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.nav-item-neon:hover {
  color: #00f0ff;
  text-shadow:
    0 0 5px #00f0ff,
    0 0 10px #00f0ff;
}

.nav-item-neon.active {
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.1);
  box-shadow:
    0 0 10px #00f0ff,
    inset 0 0 10px rgba(0, 240, 255, 0.1);
}
```

---

## ✨ 交互设计

### 1. 故障效果

#### 文本故障

```css
.glitch-text {
  position: relative;
}

.glitch-text::before,
.glitch-text::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.glitch-text::before {
  left: 2px;
  text-shadow: -2px 0 #ff00ff;
  animation: glitch-1 2s infinite linear alternate-reverse;
}

.glitch-text::after {
  left: -2px;
  text-shadow: -2px 0 #00f0ff;
  animation: glitch-2 3s infinite linear alternate-reverse;
}

@keyframes glitch-1 {
  0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
  20% { clip-path: inset(20% 0 60% 0); transform: translate(-2px, 2px); }
  40% { clip-path: inset(40% 0 40% 0); transform: translate(2px, -2px); }
  60% { clip-path: inset(60% 0 20% 0); transform: translate(-2px, 2px); }
  80% { clip-path: inset(80% 0 0 0); transform: translate(2px, -2px); }
}

@keyframes glitch-2 {
  0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); }
  20% { clip-path: inset(60% 0 20% 0); transform: translate(2px, -2px); }
  40% { clip-path: inset(40% 0 40% 0); transform: translate(-2px, 2px); }
  60% { clip-path: inset(20% 0 60% 0); transform: translate(2px, -2px); }
  80% { clip-path: inset(0 0 80% 0); transform: translate(-2px, 2px); }
}
```

### 2. 悬停效果

#### 霓虹悬停

```css
.card-neon {
  transition: all 0.3s ease;
}

.card-neon:hover {
  box-shadow:
    0 0 20px #00f0ff,
    0 0 40px rgba(0, 240, 255, 0.5);
  transform: translateY(-4px);
}
```

### 3. 点击效果

#### 霓虹点击

```css
.button-neon {
  transition: all 0.15s ease;
}

.button-neon:active {
  transform: scale(0.98);
  box-shadow:
    0 0 5px #00f0ff,
    0 0 10px rgba(0, 240, 255, 0.3);
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
│   ├── cyberpunk/
│   │   ├── NeonCard.tsx
│   │   ├── NeonButton.tsx
│   │   ├── NeonInput.tsx
│   │   └── HologramCard.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── common/
│       ├── Loading.tsx
│       └── Error.tsx
├── styles/
│   ├── neon.css
│   ├── glitch.css
│   └── variables.css
├── hooks/
│   ├── useNeonEffect.ts
│   └── useGlitchAnimation.ts
└── utils/
    ├── color.ts
    └── animation.ts
```

### 3. 性能优化

#### 懒加载

```typescript
const LazyNeonCard = React.lazy(() => import('./components/cyberpunk/NeonCard'));

const App = () => {
  return (
    <React.Suspense fallback={<Loading />}>
      <LazyNeonCard />
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
            <NeonCard item={items[virtualItem.index]} />
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

#### 霓虹卡片组件

```typescript
import React from 'react';

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
}

export const NeonCard: React.FC<NeonCardProps> = ({
  children,
  className = '',
  color = '#00f0ff',
}) => {
  return (
    <div
      className="card-neon"
      style={{
        '--neon-color': color,
      }}
    >
      {children}
    </div>
  );
};
```

#### 故障文本组件

```typescript
import React, { useState, useEffect } from 'react';

interface GlitchTextProps {
  text: string;
  className?: string;
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  className = '',
}) => {
  const [isGlitching, setIsGlitching] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(Math.random() > 0.7);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <span
      className={`glitch-text ${isGlitching ? 'glitching' : ''} ${className}`}
      data-text={text}
    >
      {text}
    </span>
  );
};
```

### 2. 自定义Hooks

#### 霓虹效果Hook

```typescript
import { useEffect, useRef } from 'react';

export const useNeonEffect = (color: string = '#00f0ff') => {
  const elementRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!elementRef.current) return;
    
    const element = elementRef.current;
    
    // 添加脉冲发光效果
    const addPulseEffect = () => {
      element.style.setProperty('--neon-glow', color);
    };
    
    addPulseEffect();
    
    return () => {
      element.style.removeProperty('--neon-glow');
    };
  }, [color]);
  
  return elementRef;
};
```

#### 故障动画Hook

```typescript
import { useEffect, useState } from 'react';

export const useGlitchAnimation = (enabled: boolean = true) => {
  const [isGlitching, setIsGlitching] = useState(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      setIsGlitching(Math.random() > 0.8);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [enabled]);
  
  return isGlitching;
};
```

---

## 📚 最佳实践

### 1. 性能优化

#### 减少重绘

```css
/* 使用transform代替top/left */
.card-neon {
  transform: translateY(0);
  transition: transform 0.3s ease;
}

.card-neon:hover {
  transform: translateY(-4px);
}
```

#### 使用will-change

```css
/* 提示浏览器优化 */
.card-neon {
  will-change: transform, opacity, box-shadow;
}

.neon-text {
  will-change: text-shadow, color;
}
```

### 2. 可访问性

#### ARIA属性

```tsx
<div
  className="card-neon"
  role="article"
  aria-label="霓虹卡片"
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
      e.preventDefault();
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
  .card-neon {
    padding: 16px;
    border-width: 1px;
  }
  
  .neon-text {
    font-size: 14px;
  }
}
```

#### 桌面端适配

```css
@media (min-width: 1024px) {
  .card-neon {
    padding: 24px;
    border-width: 2px;
  }
  
  .neon-text {
    font-size: 16px;
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
