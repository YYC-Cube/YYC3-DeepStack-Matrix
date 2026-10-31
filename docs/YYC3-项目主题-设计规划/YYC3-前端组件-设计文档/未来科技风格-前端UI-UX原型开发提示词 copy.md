---
@file: 未来科技风格-前端UI-UX原型开发提示词.md
@description: YYC3-AI-Family 未来科技风格前端UI/UX原型开发设计提示词 - 支持独立应用和AI浮窗插件模式
@author: YanYuCloudCube Team
@version: 2.0.0
@created: 2026-03-07
@updated: 2026-03-07
@status: production
@tags: future-tech, ui-ux, frontend, prototype, design-prompt, standalone, widget-plugin
---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元***
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

---

# YYC³ Portable Intelligent AI System - 未来科技风格前端UI/UX原型开发设计提示词

---

## 📋 目录导航

1. [系统架构概述](#-系统架构概述)
2. [双模式设计理念](#-双模式设计理念)
3. [独立应用模式设计](#-独立应用模式设计)
4. [AI浮窗插件模式设计](#-ai浮窗插件模式设计)
5. [共享设计系统](#-共享设计系统)
6. [视觉系统规范](#-视觉系统规范)
7. [组件库设计](#-组件库设计)
8. [交互设计规范](#-交互设计规范)
9. [开发实施指南](#-开发实施指南)
10. [最佳实践](#-最佳实践)

---

## 🏗️ 系统架构概述

### YYC³ Portable Intelligent AI System 核心架构

```
┌─────────────────────────────────────────────────────────────────┐
│              YYC³ Portable Intelligent AI System               │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           五维闭环系统架构                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ Analysis │→ │Execution │→ │Optimization│         │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  │       ↓                               ↑              │   │
│  │  ┌──────────┐  ┌──────────┐            │              │   │
│  │  │ Learning │← │Management │─────────────┘              │   │
│  │  └──────────┘  └──────────┘                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              双模式UI/UX系统                         │   │
│  │  ┌──────────────────┐  ┌──────────────────┐         │   │
│  │  │  独立应用模式     │  │ AI浮窗插件模式    │         │   │
│  │  │  Standalone App  │  │  Widget Plugin   │         │   │
│  │  └──────────────────┘  └──────────────────┘         │   │
│  │           ↓                      ↓                    │   │
│  │  ┌──────────────────────────────────────────┐        │   │
│  │  │       共享设计系统和组件库              │        │   │
│  │  └──────────────────────────────────────────┘        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 核心模块系统

```
IntelligentAIWidget 核心组件
├── ChatInterface (聊天界面)
├── ToolboxPanel (工具面板)
├── WorkflowDesigner (工作流设计器)
├── InsightsDashboard (洞察仪表板)
└── WidgetManager (窗口管理器)
    ├── AdvancedDragSystem (高级拖拽系统)
    ├── ResizeSystem (调整大小系统)
    ├── ThemeSystem (主题系统)
    ├── AnimationSystem (动画系统)
    ├── StatePersistence (状态持久化)
    ├── StateSyncManager (状态同步管理)
    ├── ResponsiveManager (响应式管理)
    ├── FeedbackManager (反馈管理)
    ├── ToastManager (通知管理)
    └── KeyboardShortcutManager (快捷键管理)
```

---

## 🎯 双模式设计理念

### 设计原则

#### 1. 统一性原则
- **共享设计语言**: 两种模式使用统一的设计系统
- **一致的用户体验**: 相同的功能在不同模式下保持一致的交互逻辑
- **品牌一致性**: 统一的视觉风格和品牌元素

#### 2. 适应性原则
- **场景适配**: 根据使用场景自动调整界面布局和功能
- **设备适配**: 支持不同设备和屏幕尺寸
- **用户偏好**: 支持用户个性化设置和偏好

#### 3. 可扩展性原则
- **模块化设计**: 功能模块独立，可按需加载
- **插件化架构**: 支持第三方插件扩展
- **API开放**: 提供开放的API接口

### 模式切换机制

```typescript
// 模式配置接口
interface WidgetModeConfig {
  mode: 'standalone' | 'widget';
  standaloneConfig?: StandaloneConfig;
  widgetConfig?: WidgetConfig;
}

// 独立应用配置
interface StandaloneConfig {
  fullScreen: boolean;
  showNavigation: boolean;
  showSidebar: boolean;
  enableAllModules: boolean;
}

// 浮窗插件配置
interface WidgetConfig {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size: 'small' | 'medium' | 'large' | 'custom';
  enableDrag: boolean;
  enableResize: boolean;
  autoHide: boolean;
}
```

---

## 💻 独立应用模式设计

### 应用架构

```
┌─────────────────────────────────────────────────────────────────┐
│                  YYC³ 独立应用界面                          │
├─────────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  顶部导航栏 (Header Navigation)                        │   │
│  │  [Logo] [导航菜单] [搜索] [用户] [设置] [主题]        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────┬────────────────────────────────────────┐    │
│  │              │                                        │    │
│  │  侧边栏       │           主内容区域                  │    │
│  │  Sidebar     │           Main Content                │    │
│  │              │                                        │    │
│  │  [聊天]      │  ┌────────────────────────────────┐  │    │
│  │  [工具]      │  │                                │  │    │
│  │  [工作流]    │  │      聊天界面                 │  │    │
│  │  [洞察]      │  │      Chat Interface            │  │    │
│  │  [设置]      │  │                                │  │    │
│  │              │  └────────────────────────────────┘  │    │
│  │  [历史记录]  │                                        │    │
│  │              │  ┌────────────────────────────────┐  │    │
│  │  [收藏]      │  │                                │  │    │
│  │              │  │      工具面板                 │  │    │
│  │              │  │      Toolbox Panel             │  │    │
│  │              │  │                                │  │    │
│  │              │  └────────────────────────────────┘  │    │
│  │              │                                        │    │
│  │              │  ┌────────────────────────────────┐  │    │
│  │              │  │                                │  │    │
│  │              │  │      工作流设计器             │  │    │
│  │              │  │      Workflow Designer         │  │    │
│  │              │  │                                │  │    │
│  │              │  └────────────────────────────────┘  │    │
│  │              │                                        │    │
│  │              │  ┌────────────────────────────────┐  │    │
│  │              │  │                                │  │    │
│  │              │  │      洞察仪表板               │  │    │
│  │              │  │      Insights Dashboard        │  │    │
│  │              │  │                                │  │    │
│  │              │  └────────────────────────────────┘  │    │
│  │              │                                        │    │
│  └──────────────┴────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  底部状态栏 (Status Bar)                              │   │
│  │  [状态] [性能] [通知] [版本]                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 布局规范

#### 全屏布局
```css
/* 独立应用全屏布局 */
.standalone-app {
  display: grid;
  grid-template-rows: 64px 1fr 40px;  /* 顶部导航 | 主内容 | 底部状态 */
  grid-template-columns: 280px 1fr;    /* 侧边栏 | 主内容 */
  height: 100vh;
  overflow: hidden;
}

/* 顶部导航栏 */
.standalone-header {
  grid-column: 1 / -1;
  grid-row: 1;
  background: white;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 侧边栏 */
.standalone-sidebar {
  grid-column: 1;
  grid-row: 2;
  background: #f8f9fa;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  overflow-y: auto;
}

/* 主内容区域 */
.standalone-main {
  grid-column: 2;
  grid-row: 2;
  background: white;
  overflow-y: auto;
  padding: 24px;
}

/* 底部状态栏 */
.standalone-footer {
  grid-column: 1 / -1;
  grid-row: 3;
  background: #f8f9fa;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

#### 响应式布局
```css
/* 平板端布局 */
@media (max-width: 1024px) {
  .standalone-app {
    grid-template-columns: 240px 1fr;
  }

  .standalone-sidebar {
    transform: translateX(0);
    transition: transform 0.3s ease;
  }

  .standalone-sidebar.collapsed {
    transform: translateX(-240px);
  }
}

/* 移动端布局 */
@media (max-width: 768px) {
  .standalone-app {
    grid-template-columns: 1fr;
    grid-template-rows: 56px 1fr 40px;
  }

  .standalone-sidebar {
    position: fixed;
    left: 0;
    top: 56px;
    bottom: 40px;
    z-index: 1000;
    transform: translateX(-100%);
  }

  .standalone-sidebar.open {
    transform: translateX(0);
  }

  .standalone-main {
    grid-column: 1;
    grid-row: 2;
  }
}
```

### 导航系统

#### 顶部导航栏
```typescript
interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  active?: boolean;
}

const navigationItems: NavigationItem[] = [
  { id: 'chat', label: '聊天', icon: 'MessageCircle', path: '/chat', active: true },
  { id: 'tools', label: '工具', icon: 'Tool', path: '/tools', badge: 3 },
  { id: 'workflow', label: '工作流', icon: 'Workflow', path: '/workflow' },
  { id: 'insights', label: '洞察', icon: 'BarChart3', path: '/insights' },
  { id: 'settings', label: '设置', icon: 'Settings', path: '/settings' },
];
```

#### 侧边栏导航
```typescript
interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  active?: boolean;
}

const sidebarSections: SidebarSection[] = [
  {
    title: '主要功能',
    items: [
      { id: 'chat', label: 'AI聊天', icon: 'MessageCircle', path: '/chat', active: true },
      { id: 'tools', label: 'AI工具', icon: 'Tool', path: '/tools', badge: 12 },
      { id: 'workflow', label: '工作流', icon: 'Workflow', path: '/workflow' },
      { id: 'insights', label: '数据洞察', icon: 'BarChart3', path: '/insights' },
    ],
  },
  {
    title: '个人中心',
    items: [
      { id: 'history', label: '历史记录', icon: 'History', path: '/history' },
      { id: 'favorites', label: '收藏夹', icon: 'Star', path: '/favorites' },
      { id: 'profile', label: '个人资料', icon: 'User', path: '/profile' },
    ],
  },
];
```

### 页面设计

#### 聊天页面
```css
/* 聊天页面布局 */
.chat-page {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-template-rows: 1fr 80px;
  height: 100%;
  gap: 24px;
}

/* 会话列表 */
.chat-sessions {
  grid-column: 1;
  grid-row: 1 / -1;
  background: #f8f9fa;
  border-radius: 12px;
  overflow-y: auto;
}

/* 聊天主区域 */
.chat-main {
  grid-column: 2;
  grid-row: 1;
  background: white;
  border-radius: 12px;
  overflow-y: auto;
  padding: 24px;
}

/* 输入区域 */
.chat-input {
  grid-column: 2;
  grid-row: 2;
  background: white;
  border-radius: 12px;
  padding: 16px;
}
```

#### 工具页面
```css
/* 工具页面布局 */
.tools-page {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  padding: 24px;
}

/* 工具卡片 */
.tool-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
}

.tool-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
}
```

---

## 🎨 AI浮窗插件模式设计

### 浮窗架构

```
┌─────────────────────────────────────────────────────────────────┐
│                  宿主应用页面                                │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │              宿主应用内容                              │   │
│  │                                                       │   │
│  │                                                       │   │
│  │                                                       │   │
│  │                                                       │   │
│  │                                                       │   │
│  │                                                       │   │
│  │                                                       │   │
│  │                                                       │   │
│  │                                                       │   │
│  │                                                       │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  YYC³ AI 浮窗插件 (Widget Plugin)                     │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  浮窗标题栏 (Widget Header)                  │    │   │
│  │  │  [YYC³ AI] [最小化] [最大化] [关闭]         │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │                                               │    │   │
│  │  │  模块切换标签 (Module Tabs)                   │    │   │
│  │  │  [聊天] [工具] [工作流] [洞察]               │    │   │
│  │  │                                               │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │                                               │    │   │
│  │  │  活动模块内容 (Active Module)                  │    │   │
│  │  │                                               │    │   │
│  │  │  ┌─────────────────────────────────────┐       │    │   │
│  │  │  │                                 │       │    │   │
│  │  │  │     聊天界面                   │       │    │   │
│  │  │  │     Chat Interface              │       │    │   │
│  │  │  │                                 │       │    │   │
│  │  │  └─────────────────────────────────────┘       │    │   │
│  │  │                                               │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  输入区域 (Input Area)                        │    │   │
│  │  │  [输入框] [发送] [附件] [语音]               │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  快捷操作栏 (Quick Actions)                   │    │   │
│  │  │  [新对话] [历史] [设置] [帮助]               │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 浮窗配置

#### 尺寸配置
```typescript
interface WidgetSizeConfig {
  small: { width: 320; height: 480 };
  medium: { width: 480; height: 640 };
  large: { width: 640; height: 800 };
  custom: { width: number; height: number };
}

const widgetSizes: WidgetSizeConfig = {
  small: { width: 320, height: 480 },
  medium: { width: 480, height: 640 },
  large: { width: 640, height: 800 },
  custom: { width: 0, height: 0 },
};
```

#### 位置配置
```typescript
type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';

interface WidgetPositionConfig {
  default: WidgetPosition;
  custom?: { x: number; y: number };
  enableDrag: boolean;
  enableResize: boolean;
}

const widgetPositionConfig: WidgetPositionConfig = {
  default: 'bottom-right',
  enableDrag: true,
  enableResize: true,
};
```

### 浮窗样式

#### 基础浮窗样式
```css
/* AI浮窗插件基础样式 */
.yyc3-widget-plugin {
  position: fixed;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 10000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* 浮窗标题栏 */
.widget-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
}

.widget-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.widget-header-actions {
  display: flex;
  gap: 8px;
}

.widget-header-action {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.widget-header-action:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 模块切换标签 */
.widget-tabs {
  display: flex;
  background: #f8f9fa;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding: 0 8px;
}

.widget-tab {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.widget-tab:hover {
  color: #374151;
  background: rgba(0, 0, 0, 0.02);
}

.widget-tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: white;
}

/* 浮窗内容区域 */
.widget-content {
  height: calc(100% - 120px);
  overflow-y: auto;
  padding: 16px;
}

/* 浮窗输入区域 */
.widget-input {
  padding: 12px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: white;
}

/* 浮窗快捷操作栏 */
.widget-actions {
  display: flex;
  padding: 8px 16px;
  background: #f8f9fa;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  gap: 8px;
}

.widget-action-button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: white;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.widget-action-button:hover {
  background: #f3f4f6;
  color: #111827;
}
```

#### 浮窗状态样式
```css
/* 最小化状态 */
.yyc3-widget-plugin.minimized {
  width: 48px !important;
  height: 48px !important;
  border-radius: 50%;
  overflow: hidden;
}

.yyc3-widget-plugin.minimized .widget-header {
  height: 48px;
  padding: 0;
}

.yyc3-widget-plugin.minimized .widget-header-title {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.yyc3-widget-plugin.minimized .widget-header-actions,
.yyc3-widget-plugin.minimized .widget-tabs,
.yyc3-widget-plugin.minimized .widget-content,
.yyc3-widget-plugin.minimized .widget-input,
.yyc3-widget-plugin.minimized .widget-actions {
  display: none;
}

/* 最大化状态 */
.yyc3-widget-plugin.maximized {
  width: 100vw !important;
  height: 100vh !important;
  top: 0 !important;
  left: 0 !important;
  border-radius: 0;
}

/* 隐藏状态 */
.yyc3-widget-plugin.hidden {
  transform: translateY(100%);
  opacity: 0;
  pointer-events: none;
}

/* 显示状态 */
.yyc3-widget-plugin.visible {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}
```

### 浮窗交互

#### 拖拽功能
```typescript
interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

class WidgetDragSystem {
  private dragState: DragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  };

  private widget: HTMLElement;
  private header: HTMLElement;

  constructor(widget: HTMLElement, header: HTMLElement) {
    this.widget = widget;
    this.header = header;
    this.initializeDrag();
  }

  private initializeDrag(): void {
    this.header.addEventListener('mousedown', this.startDrag.bind(this));
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.endDrag.bind(this));
  }

  private startDrag(e: MouseEvent): void {
    this.dragState.isDragging = true;
    this.dragState.startX = e.clientX;
    this.dragState.startY = e.clientY;
    this.dragState.initialX = this.widget.offsetLeft;
    this.dragState.initialY = this.widget.offsetTop;

    this.widget.style.transition = 'none';
  }

  private drag(e: MouseEvent): void {
    if (!this.dragState.isDragging) return;

    const deltaX = e.clientX - this.dragState.startX;
    const deltaY = e.clientY - this.dragState.startY;

    this.widget.style.left = `${this.dragState.initialX + deltaX}px`;
    this.widget.style.top = `${this.dragState.initialY + deltaY}px`;
  }

  private endDrag(): void {
    this.dragState.isDragging = false;
    this.widget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }
}
```

#### 调整大小功能
```typescript
class WidgetResizeSystem {
  private widget: HTMLElement;
  private resizeHandle: HTMLElement;
  private isResizing: boolean = false;
  private startWidth: number = 0;
  private startHeight: number = 0;
  private startX: number = 0;
  private startY: number = 0;

  constructor(widget: HTMLElement, resizeHandle: HTMLElement) {
    this.widget = widget;
    this.resizeHandle = resizeHandle;
    this.initializeResize();
  }

  private initializeResize(): void {
    this.resizeHandle.addEventListener('mousedown', this.startResize.bind(this));
    document.addEventListener('mousemove', this.resize.bind(this));
    document.addEventListener('mouseup', this.endResize.bind(this));
  }

  private startResize(e: MouseEvent): void {
    this.isResizing = true;
    this.startWidth = this.widget.offsetWidth;
    this.startHeight = this.widget.offsetHeight;
    this.startX = e.clientX;
    this.startY = e.clientY;

    this.widget.style.transition = 'none';
    e.preventDefault();
  }

  private resize(e: MouseEvent): void {
    if (!this.isResizing) return;

    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    this.widget.style.width = `${Math.max(320, this.startWidth + deltaX)}px`;
    this.widget.style.height = `${Math.max(480, this.startHeight + deltaY)}px`;
  }

  private endResize(): void {
    this.isResizing = false;
    this.widget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }
}
```

---

## 🎨 共享设计系统

### 设计Token系统

#### 色彩Token
```css
:root {
  /* 主色调 */
  --yyc3-primary-start: #667eea;
  --yyc3-primary-end: #764ba2;
  --yyc3-primary: #667eea;
  --yyc3-primary-hover: #5a6fd6;
  --yyc3-primary-active: #4e62c2;

  /* 辅助色 */
  --yyc3-secondary-start: #f093fb;
  --yyc3-secondary-end: #f5576c;
  --yyc3-accent-start: #4facfe;
  --yyc3-accent-end: #00f2fe;

  /* 中性色 */
  --yyc3-white: #ffffff;
  --yyc3-gray-50: #f9fafb;
  --yyc3-gray-100: #f3f4f6;
  --yyc3-gray-200: #e5e7eb;
  --yyc3-gray-300: #d1d5db;
  --yyc3-gray-400: #9ca3af;
  --yyc3-gray-500: #6b7280;
  --yyc3-gray-600: #4b5563;
  --yyc3-gray-700: #374151;
  --yyc3-gray-800: #1f2937;
  --yyc3-gray-900: #111827;

  /* 功能色 */
  --yyc3-success: #10b981;
  --yyc3-warning: #f59e0b;
  --yyc3-error: #ef4444;
  --yyc3-info: #3b82f6;
}
```

#### 间距Token
```css
:root {
  --yyc3-space-1: 4px;
  --yyc3-space-2: 8px;
  --yyc3-space-3: 12px;
  --yyc3-space-4: 16px;
  --yyc3-space-5: 20px;
  --yyc3-space-6: 24px;
  --yyc3-space-8: 32px;
  --yyc3-space-10: 40px;
  --yyc3-space-12: 48px;
  --yyc3-space-16: 64px;
}
```

#### 圆角Token
```css
:root {
  --yyc3-radius-none: 0px;
  --yyc3-radius-sm: 4px;
  --yyc3-radius-md: 8px;
  --yyc3-radius-lg: 12px;
  --yyc3-radius-xl: 16px;
  --yyc3-radius-2xl: 20px;
  --yyc3-radius-full: 9999px;
}
```

#### 阴影Token
```css
:root {
  --yyc3-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
  --yyc3-shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.08);
  --yyc3-shadow-md: 0 4px 8px rgba(0, 0, 0, 0.12);
  --yyc3-shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.15);
  --yyc3-shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.2);
  --yyc3-shadow-2xl: 0 40px 80px rgba(0, 0, 0, 0.25);
}
```

### 组件库设计

#### 基础组件

**按钮组件**
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'link';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  children,
  onClick,
}) => {
  return (
    <button
      className={`yyc3-button yyc3-button--${variant} yyc3-button--${size}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <LoadingSpinner />}
      {icon && !loading && <span className="yyc3-button__icon">{icon}</span>}
      <span className="yyc3-button__content">{children}</span>
    </button>
  );
};
```

**输入框组件**
```typescript
interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  multiline?: boolean;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  icon,
  multiline = false,
}) => {
  const Component = multiline ? 'textarea' : 'input';

  return (
    <div className={`yyc3-input ${error ? 'yyc3-input--error' : ''}`}>
      {icon && <span className="yyc3-input__icon">{icon}</span>}
      <Component
        type={type}
        className="yyc3-input__field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      />
      {error && <span className="yyc3-input__error">{error}</span>}
    </div>
  );
};
```

**卡片组件**
```typescript
interface CardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  hoverable?: boolean;
  gradient?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  description,
  icon,
  actions,
  children,
  hoverable = false,
  gradient = false,
}) => {
  return (
    <div
      className={`yyc3-card ${hoverable ? 'yyc3-card--hoverable' : ''} ${gradient ? 'yyc3-card--gradient' : ''}`}
    >
      {(title || icon) && (
        <div className="yyc3-card__header">
          {icon && <span className="yyc3-card__icon">{icon}</span>}
          {title && <h3 className="yyc3-card__title">{title}</h3>}
        </div>
      )}
      {description && <p className="yyc3-card__description">{description}</p>}
      {children && <div className="yyc3-card__content">{children}</div>}
      {actions && <div className="yyc3-card__actions">{actions}</div>}
    </div>
  );
};
```

#### 业务组件

**聊天消息组件**
```typescript
interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    attachments?: Attachment[];
  };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  return (
    <div className={`yyc3-chat-message yyc3-chat-message--${message.role}`}>
      <div className="yyc3-chat-message__avatar">
        {message.role === 'user' ? <UserIcon /> : <BotIcon />}
      </div>
      <div className="yyc3-chat-message__content">
        <div className="yyc3-chat-message__text">{message.content}</div>
        {message.attachments && (
          <div className="yyc3-chat-message__attachments">
            {message.attachments.map((attachment) => (
              <Attachment key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}
        <div className="yyc3-chat-message__timestamp">
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};
```

**工具卡片组件**
```typescript
interface ToolCardProps {
  tool: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
  };
  onClick?: (toolId: string) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onClick }) => {
  return (
    <div
      className="yyc3-tool-card"
      onClick={() => onClick?.(tool.id)}
    >
      <div className="yyc3-tool-card__icon">
        <img src={tool.icon} alt={tool.name} />
      </div>
      <div className="yyc3-tool-card__content">
        <h4 className="yyc3-tool-card__name">{tool.name}</h4>
        <p className="yyc3-tool-card__description">{tool.description}</p>
        <span className="yyc3-tool-card__category">{tool.category}</span>
      </div>
    </div>
  );
};
```

---

## 🎨 视觉系统规范

### 色彩系统

#### 主色调应用
```css
/* 主色调渐变 */
.yyc3-gradient-primary {
  background: linear-gradient(135deg, var(--yyc3-primary-start) 0%, var(--yyc3-primary-end) 100%);
}

/* 辅助色渐变 */
.yyc3-gradient-secondary {
  background: linear-gradient(135deg, var(--yyc3-secondary-start) 0%, var(--yyc3-secondary-end) 100%);
}

/* 强调色渐变 */
.yyc3-gradient-accent {
  background: linear-gradient(135deg, var(--yyc3-accent-start) 0%, var(--yyc3-accent-end) 100%);
}
```

#### 功能色应用
```css
/* 成功状态 */
.yyc3-status--success {
  color: var(--yyc3-success);
  background: rgba(16, 185, 129, 0.1);
}

/* 警告状态 */
.yyc3-status--warning {
  color: var(--yyc3-warning);
  background: rgba(245, 158, 11, 0.1);
}

/* 错误状态 */
.yyc3-status--error {
  color: var(--yyc3-error);
  background: rgba(239, 68, 68, 0.1);
}

/* 信息状态 */
.yyc3-status--info {
  color: var(--yyc3-info);
  background: rgba(59, 130, 246, 0.1);
}
```

### 字体系统

#### 字体家族
```css
:root {
  --yyc3-font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --yyc3-font-mono: 'SF Mono', 'Monaco', 'Consolas', 'Courier New', monospace;
}
```

#### 字体大小
```css
:root {
  --yyc3-text-xs: 12px;
  --yyc3-text-sm: 14px;
  --yyc3-text-base: 16px;
  --yyc3-text-lg: 18px;
  --yyc3-text-xl: 20px;
  --yyc3-text-2xl: 24px;
  --yyc3-text-3xl: 32px;
  --yyc3-text-4xl: 40px;
}
```

### 主题系统

#### 浅色主题
```css
[data-theme="light"] {
  --yyc3-bg-primary: #ffffff;
  --yyc3-bg-secondary: #f8f9fa;
  --yyc3-bg-tertiary: #f3f4f6;
  --yyc3-text-primary: #111827;
  --yyc3-text-secondary: #6b7280;
  --yyc3-text-tertiary: #9ca3af;
  --yyc3-border-color: rgba(0, 0, 0, 0.1);
}
```

#### 深色主题
```css
[data-theme="dark"] {
  --yyc3-bg-primary: #1a1a2a;
  --yyc3-bg-secondary: #252530;
  --yyc3-bg-tertiary: #2d2d3a;
  --yyc3-text-primary: #ffffff;
  --yyc3-text-secondary: #a0a0a0;
  --yyc3-text-tertiary: #6b7280;
  --yyc3-border-color: rgba(255, 255, 255, 0.1);
}
```

---

## 🧩 组件库设计

### 聊天界面组件

#### 聊天界面容器
```typescript
interface ChatInterfaceProps {
  mode: 'standalone' | 'widget';
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  mode,
  messages,
  onSendMessage,
  onTyping,
}) => {
  return (
    <div className={`yyc3-chat-interface yyc3-chat-interface--${mode}`}>
      <div className="yyc3-chat-interface__messages">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
      <div className="yyc3-chat-interface__input">
        <ChatInput onSend={onSendMessage} onTyping={onTyping} />
      </div>
    </div>
  );
};
```

#### 聊天输入框
```typescript
interface ChatInputProps {
  onSend: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onTyping,
  placeholder = '输入消息...',
}) => {
  const [value, setValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (value.trim()) {
      onSend(value);
      setValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping?.(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [value, isTyping, onTyping]);

  return (
    <div className="yyc3-chat-input">
      <input
        type="text"
        className="yyc3-chat-input__field"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button
        className="yyc3-chat-input__send"
        onClick={handleSend}
        disabled={!value.trim()}
      >
        <SendIcon />
      </button>
    </div>
  );
};
```

### 工具面板组件

#### 工具面板容器
```typescript
interface ToolboxPanelProps {
  mode: 'standalone' | 'widget';
  tools: Tool[];
  onToolSelect: (toolId: string) => void;
  selectedToolId?: string;
}

const ToolboxPanel: React.FC<ToolboxPanelProps> = ({
  mode,
  tools,
  onToolSelect,
  selectedToolId,
}) => {
  return (
    <div className={`yyc3-toolbox-panel yyc3-toolbox-panel--${mode}`}>
      <div className="yyc3-toolbox-panel__tools">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            selected={tool.id === selectedToolId}
            onClick={() => onToolSelect(tool.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

### 工作流设计器组件

#### 工作流画布
```typescript
interface WorkflowDesignerProps {
  mode: 'standalone' | 'widget';
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  onNodeSelect: (nodeId: string) => void;
  onNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  onConnectionAdd: (connection: WorkflowConnection) => void;
}

const WorkflowDesigner: React.FC<WorkflowDesignerProps> = ({
  mode,
  nodes,
  connections,
  onNodeSelect,
  onNodeMove,
  onConnectionAdd,
}) => {
  return (
    <div className={`yyc3-workflow-designer yyc3-workflow-designer--${mode}`}>
      <svg className="yyc3-workflow-designer__connections">
        {connections.map((connection) => (
          <ConnectionLine key={connection.id} connection={connection} />
        ))}
      </svg>
      <div className="yyc3-workflow-designer__nodes">
        {nodes.map((node) => (
          <WorkflowNode
            key={node.id}
            node={node}
            onSelect={() => onNodeSelect(node.id)}
            onMove={(position) => onNodeMove(node.id, position)}
          />
        ))}
      </div>
    </div>
  );
};
```

### 洞察仪表板组件

#### 数据图表组件
```typescript
interface InsightsDashboardProps {
  mode: 'standalone' | 'widget';
  metrics: DashboardMetrics[];
  charts: ChartData[];
}

const InsightsDashboard: React.FC<InsightsDashboardProps> = ({
  mode,
  metrics,
  charts,
}) => {
  return (
    <div className={`yyc3-insights-dashboard yyc3-insights-dashboard--${mode}`}>
      <div className="yyc3-insights-dashboard__metrics">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      <div className="yyc3-insights-dashboard__charts">
        {charts.map((chart) => (
          <ChartCard key={chart.id} chart={chart} />
        ))}
      </div>
    </div>
  );
};
```

---

## 🔄 交互设计规范

### 动画系统

#### 过渡动画
```css
/* 淡入淡出 */
.yyc3-fade-enter {
  animation: yyc3FadeIn 0.3s ease-out;
}

.yyc3-fade-exit {
  animation: yyc3FadeOut 0.3s ease-in;
}

@keyframes yyc3FadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes yyc3FadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* 滑动动画 */
.yyc3-slide-enter {
  animation: yyc3SlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.yyc3-slide-exit {
  animation: yyc3SlideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes yyc3SlideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes yyc3SlideOut {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-20px);
    opacity: 0;
  }
}

/* 缩放动画 */
.yyc3-scale-enter {
  animation: yyc3ScaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.yyc3-scale-exit {
  animation: yyc3ScaleOut 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes yyc3ScaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes yyc3ScaleOut {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.95);
    opacity: 0;
  }
}
```

### 状态反馈

#### 加载状态
```typescript
const LoadingSpinner: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({
  size = 'medium',
}) => {
  return (
    <div className={`yyc3-loading-spinner yyc3-loading-spinner--${size}`}>
      <svg className="yyc3-loading-spinner__svg" viewBox="0 0 50 50">
        <circle
          className="yyc3-loading-spinner__circle"
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="4"
        />
      </svg>
    </div>
  );
};
```

#### 错误状态
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      fallback || (
        <div className="yyc3-error-boundary">
          <div className="yyc3-error-boundary__icon">
            <ErrorIcon />
          </div>
          <h3 className="yyc3-error-boundary__title">出错了</h3>
          <p className="yyc3-error-boundary__message">
            页面加载失败，请刷新重试
          </p>
          <button
            className="yyc3-error-boundary__retry"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </button>
        </div>
      )
    );
  }

  return <>{children}</>;
};
```

---

## 💻 开发实施指南

### 技术栈推荐

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

### 项目结构

```
src/
├── components/
│   ├── shared/              # 共享组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   ├── standalone/          # 独立应用组件
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   ├── widget/              # 浮窗插件组件
│   │   ├── WidgetContainer.tsx
│   │   ├── WidgetHeader.tsx
│   │   ├── WidgetTabs.tsx
│   │   └── WidgetActions.tsx
│   ├── modules/             # 功能模块
│   │   ├── ChatInterface.tsx
│   │   ├── ToolboxPanel.tsx
│   │   ├── WorkflowDesigner.tsx
│   │   └── InsightsDashboard.tsx
│   └── ui/                 # UI组件
│       ├── ChatMessage.tsx
│       ├── ToolCard.tsx
│       ├── WorkflowNode.tsx
│       └── MetricCard.tsx
├── hooks/
│   ├── useWidgetMode.ts     # 模式切换Hook
│   ├── useTheme.ts         # 主题Hook
│   └── useResponsive.ts    # 响应式Hook
├── styles/
│   ├── variables.css        # CSS变量
│   ├── themes.css          # 主题样式
│   └── components.css      # 组件样式
├── utils/
│   ├── mode-detection.ts   # 模式检测
│   └── widget-config.ts    # 浮窗配置
└── types/
    ├── widget.ts           # 浮窗类型
    └── standalone.ts      # 独立应用类型
```

### 模式检测

```typescript
// 模式检测工具
export const detectWidgetMode = (): 'standalone' | 'widget' => {
  // 检查是否在iframe中
  if (window.self !== window.top) {
    return 'widget';
  }

  // 检查URL参数
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  if (mode === 'widget') {
    return 'widget';
  }

  // 检查localStorage
  const savedMode = localStorage.getItem('yyc3-mode');
  if (savedMode) {
    return savedMode as 'standalone' | 'widget';
  }

  // 默认为独立应用模式
  return 'standalone';
};

// 模式切换Hook
export const useWidgetMode = () => {
  const [mode, setMode] = useState<'standalone' | 'widget'>(detectWidgetMode());

  const switchMode = (newMode: 'standalone' | 'widget') => {
    setMode(newMode);
    localStorage.setItem('yyc3-mode', newMode);
  };

  return { mode, switchMode };
};
```

---

## 📚 最佳实践

### 性能优化

#### 懒加载
```typescript
// 模块懒加载
const LazyWorkflowDesigner = React.lazy(() =>
  import('./modules/WorkflowDesigner')
);

const LazyInsightsDashboard = React.lazy(() =>
  import('./modules/InsightsDashboard')
);

// 使用懒加载组件
const App = () => {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <LazyWorkflowDesigner />
      <LazyInsightsDashboard />
    </React.Suspense>
  );
};
```

#### 虚拟滚动
```typescript
// 长列表虚拟滚动
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualChatMessages = ({ messages }: { messages: ChatMessage[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
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
            <ChatMessage message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 可访问性

#### 键盘导航
```typescript
// 键盘导航Hook
export const useKeyboardNavigation = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Tab':
          // 确保焦点顺序正确
          break;
        case 'Enter':
        case ' ':
          // 激活当前焦点元素
          break;
        case 'Escape':
          // 关闭模态框或下拉菜单
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          // 在列表中导航
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

#### ARIA属性
```typescript
// ARIA属性示例
const AccessibleButton = ({ children, ...props }: ButtonProps) => {
  return (
    <button
      {...props}
      role="button"
      aria-label={props['aria-label']}
      aria-pressed={props['aria-pressed']}
      aria-expanded={props['aria-expanded']}
      aria-disabled={props.disabled}
    >
      {children}
    </button>
  );
};
```

---

## 📋 设计检查清单

### 独立应用模式检查
- [ ] 顶部导航栏完整且响应式
- [ ] 侧边栏可折叠且移动端适配
- [ ] 主内容区域布局合理
- [ ] 底部状态栏信息完整
- [ ] 所有模块在全屏模式下正常工作
- [ ] 响应式设计覆盖所有断点
- [ ] 键盘导航完整可用
- [ ] 屏幕阅读器支持完善

### 浮窗插件模式检查
- [ ] 浮窗标题栏可拖拽
- [ ] 浮窗可调整大小
- [ ] 模块切换标签功能正常
- [ ] 最小化/最大化功能正常
- [ ] 快捷操作栏功能完整
- [ ] 浮窗在不同位置正常显示
- [ ] 浮窗在宿主应用中不冲突
- [ ] 浮窗状态持久化正常

### 共享设计系统检查
- [ ] 设计Token完整定义
- [ ] 组件库覆盖所有需求
- [ ] 主题切换功能正常
- [ ] 动画效果流畅自然
- [ ] 状态反馈清晰明确
- [ ] 错误处理机制完善
- [ ] 性能优化到位
- [ ] 可访问性符合WCAG标准

---

## 📞 联系和支持

**设计团队**: YanYuCloudCube Design Team  
**技术支持**: admin@0379.email  
**项目地址**: https://github.com/YYC-Cube/yyc3-Portable-Intelligent-AI-System

---

<div align="center">

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

</div>
