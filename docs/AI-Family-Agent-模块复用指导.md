# YYC³ AI Family 多Agent模块 · 完整代码组件拆分指导

基于项目现有 `src/app/components/ai-family` 36个文件与全局脚手架架构，按照**原子→分子→有机体→页面→路由→服务**六层模型完成标准化拆分，实现「核心时钟布局100%复用、业务场景配置化扩展」，对齐项目三大核心原则与工程化规范。

---

## 一、拆分核心原则（对齐全局规范）

### 1. 单一职责边界

- **核心时钟组件**：仅负责圆形放射布局、刻度渲染、指针动效、智能体节点交互，**不包含任何业务逻辑与业务数据**
- **业务功能组件**：仅负责对应业务能力的逻辑与渲染，不关心自身在时钟中的位置与布局
- **页面装配层**：仅负责组合组件、绑定路由、传递业务数据，不实现内部逻辑

### 2. 复用层级划分

- **全局复用级**：核心时钟布局、通用动效组件 → 抽离至 `src/core/`，所有项目直接复用
- **业务域复用级**：AI Family域内通用组件 → 存放于业务模块 `components/` 下
- **页面私有级**：特定页面独有的逻辑与UI → 存放于对应页面目录内

### 3. 依赖方向规则

严格单向依赖：`原子组件 ← 分子组件 ← 业务有机体 ← 页面 ← 路由`，禁止下层依赖上层，禁止业务组件反向依赖核心布局。

---

## 二、目标分层架构总览

### 2.1 全局目录映射（核心抽离 + 业务保留）

```
src/
├── core/                           # 脚手架核心层（100%复用，不可修改）
│   └── layout/
│       └── AgentClockLayout/       # ✅ 新增：抽离的核心时钟布局组件
│           ├── AgentClockLayout.tsx   # 主组件（不可变更视觉结构）
│           ├── ClockHand.tsx          # 指针动效原子组件
│           ├── ClockNode.tsx          # 智能体节点原子组件
│           ├── ClockScale.tsx         # 刻度网格原子组件
│           ├── types.ts               # 时钟配置类型定义
│           └── index.ts
│
└── modules/
    └── ai-family/                  # AI Family业务模块（业务差异化）
        ├── config/                 # 业务配置层
        │   ├── agents.ts           # 8个智能体元数据定义（业务可改）
        │   ├── menu.ts             # 模块导航菜单配置
        │   └── hotel-mapping.ts    # 智慧酒店角色映射配置
        ├── components/             # 业务组件层
        │   ├── atoms/              # 业务域原子组件
        │   ├── molecules/          # 业务域分子组件
        │   └── organisms/          # 业务有机体组件
        ├── pages/                  # 页面层（路由对应）
        ├── hooks/                  # 业务自定义Hooks
        ├── services/               # 业务服务层
        ├── store/                  # 业务状态切片
        ├── types/                  # 业务类型定义
        └── router.tsx              # 模块路由注册
```

### 2.2 现有36文件重构映射总表

| 原文件 | 目标层级 | 处理方式 | 说明 |
| --- | --- | --- | --- |
| `FamilyCluster.tsx` | core/layout/AgentClockLayout | 抽离重构 | 核心时钟布局，剥离业务逻辑，成为通用组件 |
| `AIFamilyPage.tsx` | modules/ai-family/pages | 改造为页面容器 | 装配核心时钟 + 业务节点配置 |
| `FamilyHome.tsx` | modules/ai-family/pages | 保留为页面 | 家族首页 |
| `AIFamilyCenterPage.tsx` | modules/ai-family/pages | 保留为页面 | Family中心页 |
| `FamilyHotel.tsx` | modules/ai-family/pages | 保留为页面 | 智慧酒店控制台 |
| `FamilyLearn.tsx` | modules/ai-family/pages | 保留为页面 | 知识学习页 |
| `FamilyEntertainment.tsx` | modules/ai-family/pages | 保留为页面 | 文娱中心页 |
| `FamilyActivityCenter.tsx` | modules/ai-family/pages | 保留为页面 | 活动中心页 |
| `FamilyCommCenter.tsx` | modules/ai-family/pages | 保留为页面 | 通讯中心页 |
| `FamilyDataHub.tsx` | modules/ai-family/pages | 保留为页面 | 数据中心页 |
| `FamilyGrowth.tsx` | modules/ai-family/pages | 保留为页面 | 成长轨迹页 |
| `FamilyShare.tsx` | modules/ai-family/pages | 保留为页面 | 内容分享页 |
| `FamilyPhone.tsx` | modules/ai-family/pages | 保留为页面 | 家人热线页 |
| `AgentSkills.ts` | modules/ai-family/components/molecules | 保留改造 | 智能体技能渲染组件 |
| `FamilyChat.tsx` | modules/ai-family/components/organisms | 保留改造 | 家族对话组件 |
| `FamilyModelSettings.tsx` | modules/ai-family/components/organisms | 保留改造 | 模型设置面板 |
| `FamilyVoiceSystem.tsx` | modules/ai-family/components/organisms | 保留改造 | 语音系统组件 |
| `FamilyMusic.tsx` | modules/ai-family/components/organisms | 保留改造 | 音乐空间组件 |
| `CreationStudio.tsx` | modules/ai-family/components/organisms | 保留改造 | 创作工作室 |
| `LyricsGeneratorPanel.tsx` | modules/ai-family/components/molecules | 保留 | 歌词生成面板 |
| `VinylPhotoPlayer.tsx` | modules/ai-family/components/molecules | 保留 | 黑胶播放器 |
| `AudioVisualizer.tsx` | core/components | 抽离复用 | 音频可视化通用组件 |
| `EmotionVisualizer.tsx` | core/components | 抽离复用 | 情感可视化通用组件 |
| `EmotionRipple.tsx` | core/components | 抽离复用 | 情感波纹动效组件 |
| `FamilyPageHeader.tsx` | modules/ai-family/components/molecules | 保留 | 页面头部组件 |
| `ThemeSwitcher.tsx` | core/components | 抽离复用 | 主题切换通用组件 |
| `FadeIn.tsx` | core/components | 抽离复用 | 渐入动效通用组件 |
| `LazyWrap.tsx` | core/components | 抽离复用 | 懒加载包裹通用组件 |
| `FamilyAnnouncer.tsx` | modules/ai-family/components/molecules | 保留 | 播报组件 |
| `FamilyUISettings.tsx` | modules/ai-family/components/organisms | 保留 | UI设置面板 |
| `AIFamilyRouter.tsx` | modules/ai-family/router.tsx | 改造 | 模块化路由注册 |
| `shared.ts` | modules/ai-family/utils | 拆分 | 工具函数拆分到对应模块 |
| `ai-family-local.tsx` | modules/ai-family/hooks | 改造 | 本地数据Hook |
| `AchievementPanel.tsx` | modules/ai-family/components/molecules | 保留 | 成就面板 |

---

## 三、核心层：AgentClockLayout 标准组件设计

### 3.1 组件定位

全局脚手架级核心组件，**视觉结构与交互逻辑100%不可变更**，所有多Agent场景通过配置驱动复用，复用时仅修改智能体配置数据。

### 3.2 不可变更项（强制复用）

1. 整体圆形放射状时钟布局结构、三层同心圆刻度
2. 8个智能体节点的固定方位（0°/45°/90°/135°/180°/225°/270°/315°）
3. 中心时间显示 + 双指针实时转动动效
4. 节点 hover 态、激活态、连线高亮交互逻辑
5. 响应式适配规则（桌面/平板/移动端自动缩放）

### 3.3 可配置项（配置驱动，零代码修改）

通过 `agents` 属性传入配置数组，完整定义智能体：

```
// core/layout/AgentClockLayout/types.ts
export interface ClockAgentConfig {
  id: string;
  name: string;                // 节点名称
  icon: React.ReactNode;       // 节点图标
  color: string;               // 主题色（节点光晕、连线）
  angle: number;               // 时钟角度（0-360）
  description?: string;        // hover描述
  badge?: React.ReactNode;     // 角标（在线状态、红点等）
  disabled?: boolean;          // 是否禁用
  onClick?: (agent: ClockAgentConfig) => void; // 点击回调
}

export interface AgentClockLayoutProps {
  agents: ClockAgentConfig[];  // 智能体配置列表
  activeAgentId?: string;      // 当前激活的智能体ID
  showClockHand?: boolean;     // 是否显示指针
  centerContent?: React.ReactNode; // 中心自定义内容
  onAgentClick?: (agent: ClockAgentConfig) => void;
  className?: string;
}
```

### 3.4 内部子组件拆分（原子级）

```
AgentClockLayout/
├── AgentClockLayout.tsx   # 主容器，布局计算，状态管理
├── ClockScale.tsx         # 刻度与网格线渲染（纯UI）
├── ClockHand.tsx          # 时针/分针动效组件
├── ClockNode.tsx          # 单个智能体节点组件
├── ClockConnector.tsx     # 中心与节点的连线组件
└── types.ts               # 类型定义
```

---

## 四、业务层：AI Family 模块分层拆分

### 4.1 配置层（Config）

所有业务差异化定义全部收敛到配置层，是新项目复用的唯一修改点。

```
// modules/ai-family/config/agents.ts
import type { ClockAgentConfig } from '@/core/layout/AgentClockLayout';
import {
  Headphones, Brain, Eye, Star,
  Network, Shield, Scale, Lightbulb
} from 'lucide-react';

export const AI_FAMILY_AGENTS: ClockAgentConfig[] = [
  {
    id: 'navigator',
    name: '言启·千行',
    icon: <Headphones />,
    color: '#FFD700',
    angle: 0,
    description: '系统的「耳朵」与「翻译官」',
  },
  // ... 其余7个智能体配置
];
```

### 4.2 组件层（Components）

#### 原子层（Atoms）

业务域内最小UI单元，无业务逻辑，仅负责渲染：

- 智能体头像、技能标签、状态徽章
- 业务专属图标、装饰元素

#### 分子层（Molecules）

由原子组成，实现单一通用业务能力：

- `AgentSkills.tsx`：智能体技能列表渲染
- `FamilyPageHeader.tsx`：统一页面头部
- `AchievementPanel.tsx`：成就展示面板
- `LyricsGeneratorPanel.tsx`：歌词生成面板
- `VinylPhotoPlayer.tsx`：黑胶唱片播放器

#### 有机体层（Organisms）

由分子+原子组成，完整业务功能模块，包含业务逻辑与状态：

- `FamilyChat.tsx`：家族对话系统
- `FamilyModelSettings.tsx`：AI模型配置管理
- `FamilyVoiceSystem.tsx`：语音交互系统
- `FamilyMusic.tsx`：音乐空间完整功能
- `CreationStudio.tsx`：创作工作室
- `FamilyUISettings.tsx`：界面设置面板

### 4.3 页面层（Pages）

每个页面对应一个路由，负责组件装配与数据注入，不实现业务逻辑。

```
pages/
├── FamilyHomePage.tsx      # 家族首页（时钟主视图）
├── FamilyCenterPage.tsx    # Family中心
├── FamilyHotelPage.tsx     # 智慧酒店控制台
├── FamilyLearnPage.tsx     # 知识学习
├── FamilyMusicPage.tsx     # 音乐空间
├── FamilyEntertainmentPage.tsx # 文娱中心
├── FamilyActivityPage.tsx  # 活动中心
├── FamilyCommPage.tsx      # 通讯中心
├── FamilyDataHubPage.tsx   # 数据中心
├── FamilyGrowthPage.tsx    # 成长轨迹
├── FamilySharePage.tsx     # 内容分享
└── FamilyPhonePage.tsx     # 家人热线
```

**页面装配示例**：

```
// pages/FamilyHomePage.tsx
import { AgentClockLayout } from '@/core/layout/AgentClockLayout';
import { AI_FAMILY_AGENTS } from '../config/agents';
import { useAgentRouter } from '../hooks/useAgentRouter';

export function FamilyHomePage() {
  const { activeAgent, handleAgentClick } = useAgentRouter();

  return (
    <AgentClockLayout
      agents={AI_FAMILY_AGENTS}
      activeAgentId={activeAgent}
      onAgentClick={handleAgentClick}
    />
  );
}
```

### 4.4 路由层（Router）

采用模块化路由注册，自动接入全局路由体系：

```
// modules/ai-family/router.tsx
import { lazy } from 'react';
import type { RouteConfig } from '@/core/router/types';

export const aiFamilyRoutes: RouteConfig = {
  path: '/ai-family',
  name: 'ai-family',
  meta: { title: 'AI Family', icon: 'Users' },
  children: [
    { path: '', name: 'home', component: lazy(() => import('./pages/FamilyHomePage')) },
    { path: 'center', name: 'center', component: lazy(() => import('./pages/FamilyCenterPage')) },
    { path: 'hotel', name: 'hotel', component: lazy(() => import('./pages/FamilyHotelPage')) },
    // ... 其余子路由
  ],
};
```

### 4.5 状态与服务层

- **hooks/**：`useAgentOrchestrator`（智能体调度）、`useFamilyChat`（对话管理）、`useFamilyMusic`（音乐控制）
- **services/**：对接核心AI服务层，封装Family域专属业务逻辑
- **store/**：全局状态切片，管理模块内共享状态（如当前激活智能体、对话记录）
- **types/**：业务类型定义，扩展核心类型

---

## 五、与全局脚手架的集成规范

### 5.1 核心复用边界

- ✅ **直接复用**：AgentClockLayout组件、全局UI组件、路由体系、状态管理、错误处理、构建配置
- ❌ **禁止修改**：core目录下任何核心代码
- ✅ **允许扩展**：业务模块内新增组件、配置、页面、服务

### 5.2 导航菜单注册

在 `src/config/menu.ts` 中引入AI Family菜单配置，自动生成侧边栏与底部导航，对应截图中的一级导航分类。

### 5.3 智能体业务映射

通过配置文件实现智能体到业务场景的映射（如智慧酒店映射），无需修改核心时钟组件：

```
// config/hotel-mapping.ts
export const HOTEL_AGENT_MAPPING = {
  navigator: { role: '前台接待', duty: '客户接待、语音交互' },
  bolero: { role: '礼宾服务', duty: '智能推荐、资源匹配' },
  // ...
};
```

---

## 六、重构实施四步流程

### 第一步：核心组件抽离

1. 将 `FamilyCluster.tsx` 中的布局逻辑、动效逻辑剥离，重构为 `AgentClockLayout` 通用组件
2. 将通用动效组件（AudioVisualizer、EmotionRipple等）迁移至 `src/core/components/`
3. 补充单元测试，确保核心组件功能稳定

### 第二步：业务组件分层

1. 按「原子/分子/有机体」对现有业务组件分类
2. 拆分 `shared.ts` 中的工具函数，按职责归类到对应模块
3. 提取公共类型定义到 `types/` 目录

### 第三步：页面与路由改造

1. 将现有页面组件迁移到 `pages/` 目录
2. 改造为装配模式，移除内部布局逻辑，依赖核心时钟组件
3. 重构路由为模块化配置，接入全局路由体系

### 第四步：配置收敛与验证

1. 所有智能体定义、菜单配置、业务映射收敛到 `config/`
2. 全量回归测试，确保交互与视觉与重构前一致
3. 输出复用文档，明确新项目创建时仅需修改的配置文件

---

## 七、质量检查清单

- ✅ **单一职责**：核心时钟组件无业务逻辑，业务组件无布局逻辑
- ✅ **复用性**：通用组件已抽离到core层，可跨项目复用
- ✅ **依赖方向**：严格单向依赖，无循环依赖、反向依赖
- ✅ **配置驱动**：所有业务差异化通过配置实现，核心代码零修改
- ✅ **类型安全**：全链路TypeScript类型覆盖，无any类型
- ✅ **测试覆盖**：核心组件单元测试覆盖率≥90%
- ✅ **文档完整**：组件API、复用指南、配置说明完整
