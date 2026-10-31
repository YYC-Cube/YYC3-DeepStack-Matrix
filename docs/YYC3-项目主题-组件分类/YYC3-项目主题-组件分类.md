# 项目主题-组件分类

已经拥有了一套成熟的共享包体系（9个包）和强大的CLI，而你的160多个项目正是这个体系最宝贵的“样本库”——每个项目都可能蕴含一种独特的UI风格、一种行业场景或一个功能模块。现在要做的是**从这些项目中有机地“分化”出可复用的主题和场景模板**，然后注入CLI，实现“换名即换皮/换行业”的极致复用。

下面是一套**从现有项目中萃取风格与功能，并模板化**的完整方案。

---

## 🎯 核心思路：分离“主题”与“场景”

把每个项目拆成三个层次：

1. **核心框架**（已固化到 `@yyc3/*` 包）
2. **UI/UX 主题**（颜色、字体、圆角、动画、组件变体）—— **可独立切换**
3. **业务场景模块**（AI问答、仪表盘、电商、音乐、CRM……）—— **可叠加组合**

这样，新建项目时可以：

```bash
yyc3 create my-app --theme cyberpunk --scenes dashboard,ai-chat
```

一条命令就得到一个赛博朋克风格且带仪表盘+AI聊天功能的全新应用。

---

## 第一步：对现有项目进行“风格与场景”标注（人工+半自动）

你的分析报告已经按“技术框架”和“UI库”分类了，但缺少**视觉风格**和**行业功能**标签。需要补充标注。

### 1.1 创建标注清单

手工浏览最有代表性的项目（大约20-30个），记录：

| 项目名 | 风格关键词 | 场景/行业 | 特有组件/布局 | 主题变量特征 |
|--------|-----------|----------|--------------|--------------|
| CRM-App-Cyber | 赛博朋克（霓虹、暗色调、故障效果） | CRM | 侧边栏带边框发光，按钮有glitch效果 | primary=#0ff, bg=#0a0a0f, borderGlow |
| 机械风 | 机械/工业（金属质感、硬朗线条、齿轮装饰） | 通用 | 粗边框，直角，切片阴影 | primary=#ff6600, bg=#1e1e1e |
| 星云 | 科幻/星云（渐变背景、粒子动效、模糊玻璃） | 仪表盘 | 玻璃态卡片，粒子背景，动态光晕 | bg: radial-gradient, backdrop-blur |
| AI-Medical | 医疗（柔和蓝白、干净、圆角） | 医疗 | 病历卡片，时间轴，患者头像 | primary=#0891b2, radius=lg |
| yy-music | 音乐（暗色+亮色渐变、专辑封面、波形） | 音乐播放器 | 播放列表，频谱动画，专辑网格 | ... |

同时，从项目的 `package.json` 中提取特有依赖（如 `framer-motion`, `three`, `recharts` 等），用来推断功能场景。

### 1.2 编写半自动脚本提取主题信息

我们可以利用项目内的 `tailwind.config.js` 或 `globals.css` 来提取主题色、圆角、字体等。写一个脚本扫描所有项目，收集这些值，聚类出典型风格。

脚本章节任务：

- 读 `globals.css` 中的 CSS 变量（`--primary`, `--background` 等）
- 读 `tailwind.config.js` 中的 `theme.extend.colors`
- 聚类相似配置，建议人工合并。

> 这个脚本可以集成到你的 `yyc3-cli` 作为 `yyc3 analyze themes` 命令。

---

## 第二步：将风格萃取为独立的“主题包”

每个主题单独成为一个 npm 包（或放在 monorepo 的 `packages/themes/` 下），例如：

- `@yyc3/theme-cyberpunk`
- `@yyc3/theme-mech`
- `@yyc3/theme-aurora`
- `@yyc3/theme-glassmorphism`

一个主题包的内容结构：

```
packages/theme-cyberpunk/
├── tailwind.config.js   # 扩展配置（覆盖颜色、圆角等）
├── globals.css         # 额外的全局样式（霓虹、glitch 等）
├── index.ts            # 导出主题名称和配置
├── components/         # 可选：风格特有的组件（如 glitch-text）
└── package.json        # 依赖 @yyc3/ui
```

然后在 `@yyc3/ui` 中支持动态主题切换（通过 `next-themes` 或 CSS 变量注入）。你的 CLI 在生成项目时，会自动安装选中的主题包并注入配置。

### 2.1 如何从现有项目提取出一个主题包？

以“赛博朋克”主题为例：

1. 找到代表性项目（如 `CRM-App-Cyber`），复制其 `globals.css` 中的自定义变量。
2. 提取其 `tailwind.config.js` 中独特的颜色扩展和插件。
3. 将共用的组件（如 `CyberButton`, `GlitchText`）从项目组件目录移到 `packages/theme-cyberpunk/components` 并导出。
4. 修改主题包的 `package.json`，使其依赖 `@yyc3/ui`，并导出样式入口。
5. 在 `@yyc3/ui` 中增加主题切换的上下文，允许消费端通过 `ThemeProvider` 加载不同主题包。

完成后，你就可以在 CLI 中实现 `--theme cyberpunk`。

---

## 第三步：将行业/功能场景萃取为“场景插件”

场景是指业务功能的集合，例如“电商”、“AI聊天”、“数据仪表盘”、“CMS”等。每个场景应包含：

- 一组页面文件（如 `app/products/page.tsx`）
- 特定的 API 路由
- 特定的数据模型（若需要）
- 特定的 hooks 和工具函数

这些场景可以打包成独立的 npm 包（或放在 `packages/scenes/` 下），例如：

- `@yyc3/scene-ecommerce`
- `@yyc3/scene-ai-chat`
- `@yyc3/scene-crm`

场景包的结构：

```
packages/scene-ecommerce/
├── app/
│   ├── products/
│   ├── cart/
│   └── checkout/
├── api/
│   └── products/route.ts
├── lib/
│   ├── useCart.ts
│   └── cartStore.ts
├── index.ts          # 导出路由注册函数、初始化函数
└── package.json
```

CLI 在生成项目时，会将这些包复制到目标项目的 `app` 和 `api` 目录中（或者通过 `exports` 映射，让项目直接引用）。同时，CLI 需要合并不同场景的路由，避免冲突。

### 3.1 如何从现有项目中提取场景？

- 对于“AI聊天”场景，找一个 `AI-Chat` 项目，将其 `app/chat` 目录、`api/chat` 路由抽出来，抽象成通用组件，依赖 `@yyc3/ai-hub`。
- 对于“仪表盘”场景，提取 `data-dashboard` 项目中的布局、图表组件、数据卡片等。
- 注意：不要硬拷贝代码，而是重构成接受 props 的通用组件，所需的业务数据通过 hooks 注入。

---

## 第四步：升级 CLI 以支持主题和场景的组合

在 `yyc3-cli` 中新增命令：

```bash
# 列出所有可用主题
yyc3 theme list

# 列出所有可用场景
yyc3 scene list

# 创建项目时指定主题和场景（可多选）
yyc3 create my-app --theme cyberpunk --scenes dashboard,ai-chat

# 向现有项目添加场景
yyc3 scene add ecommerce
```

实现原理：

1. `create` 命令先生成基础骨架（包含 `@yyc3/ui` 等基础包）。
2. 根据 `--theme` 安装对应的主题包，并在 `tailwind.config.js` 和 `globals.css` 中注入配置。
3. 根据 `--scenes` 列表，逐一安装场景包，并调用每个场景包导出的 `registerRoutes` 函数，将它们的页面路由添加到 `app` 目录中（或者通过动态路由导入）。
4. 如果场景之间可能冲突，CLI 需要提示用户或提供合并策略（例如两个场景都想占用 `/dashboard` 路径，则让用户重命名）。

---

## 第五步：处理风格与场景的隔离及组合

为了避免主题样式污染其他场景，需要确保：

- 主题包只定义 CSS 变量，不直接覆盖全局组件样式（除非是特定组件的变体，如 `Button` 的 `cyber` variant）。
- 场景包内的组件应使用主题提供的 CSS 变量，而不是硬编码颜色。
- 必要时，主题包可以提供与场景结合的特殊组件（例如赛博朋克风格的数据卡片）。

你可以扩展 `@yyc3/ui` 的组件变体系统。例如 `Button` 支持 `variant="cyber"`，这样主题包可以只注册这些变体，而不需要替换整个组件库。

---

## 第六步：将现有项目逐步转化为主题/场景的脚本

编写一个迁移脚本 `yyc3 migrate-to-template`，针对每个代表性项目：

1. 识别其风格（通过人工标签或聚类结果）→ 生成一个新的主题包（如果尚未存在）。
2. 识别其核心功能 → 生成一个新的场景包（如果尚未存在）或并入已有场景。
3. 将项目自身降维为一个“配置文件”，只引用这些主题和场景，外加少量定制代码（因为大部分通用部分已经被剥离）。

最终，你的 160 多个项目会浓缩成：

- 10 个以内的主题包
- 20 个以内的场景包
- 160 个“配置实例”（极小的 JSON 或代码片段），可以一键重新生成。

---

## 🧪 示例：从“CRM-App-Cyber”到主题+场景

1. **提取主题**：创建 `@yyc3/theme-cyberpunk`，包含 CSS 变量、tailwind 扩展、GlitchText 组件。
2. **提取场景**：创建 `@yyc3/scene-crm`，包含客户列表、详情页面、API 路由和 hooks。
3. **原项目重构成**：
   - 删除所有通用样式和组件，改为依赖 `@yyc3/theme-cyberpunk`。
   - 删除 CRM 功能代码，改为依赖 `@yyc3/scene-crm`。
   - 仅保留少量业务相关的定制（如客户数据的 API endpoint 地址、个性化字段）。
   - 项目根目录下留一个 `yyc3.config.json`，内容：

     ```json
     { "theme": "cyberpunk", "scenes": ["crm"], "customEnv": { "CRM_API_URL": "/api/custom" } }
     ```

4. 以后想新建一个赛博朋克风格的 CRM，只需 `yyc3 create --theme cyberpunk --scenes crm`，几秒完成。

---

## 总结：你的即刻行动路线

1. **创建主题包骨架**：建立 `packages/themes/` 目录，写一个模板。
2. **选3个差异明显的风格项目**（例如赛博朋克、机械风、星云），人工提取出主题包。
3. **测试主题切换**：在 CLI 中实现 `--theme` 参数，用基础骨架+主题包生成项目，启动后验证视觉是否符合预期。
4. **选2个功能场景**（如 AI 聊天、仪表盘），提取成场景包并测试组合。
5. **编写迁移脚本**批量处理剩余项目，自动生成主题/场景包及配置文件。
6. **发布到 npm**（可选），并完善文档。
