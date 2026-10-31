基于已构建的 `@yyc3/*` 包体系和 CLI 工具，设计一套**模板化清洗系统**。只需要维护一个模板目录，切换模板名称即可在“清洗专用目录”中快速生成任意模板的全新项目。这套方案完全可落地，且与现有的 Monorepo 结构无缝集成。

---

## 一、最终目标效果

```bash
# 1. 切换到清洗专用目录（你指定的路径）
cd /Volumes/Development/yyc3-platform/YYC3\ AI\ Call

# 2. 一行命令，使用不同模板刷新当前目录
yyc3 clean --template dashboard      # 变成仪表盘模板
yyc3 clean --template ai-chat         # 变成 AI 对话模板
yyc3 clean --template landing         # 变成落地页模板

# 3. 或者通过环境变量指定模板，实现“改名称即换皮”
export YYC3_TEMPLATE=ai-chat
yyc3 clean
```

每次执行后，目标目录会被**完全重置**为所选模板的干净副本（保留 `@yyc3/*` 依赖的本地 workspace 链接）。你可以快速体验不同模板，无需手动复制粘贴。

---

## 二、目录结构设计（扩展现有 Monorepo）

在 `yyc3-platform` 根目录下建立以下标准化结构：

```
yyc3-platform/
├── packages/               # 已有的 9 个共享包
├── templates/              # 新增：模板仓库
│   ├── dashboard/          # 仪表盘模板
│   │   ├── app/            # Next.js 应用目录
│   │   ├── components/     # 仅该模板特有的组件
│   │   ├── lib/            # 工具函数
│   │   ├── package.json    # 模板的 package.json（依赖全部来自 workspace）
│   │   └── template.config.json  # 模板元信息
│   ├── ai-chat/
│   ├── landing/
│   └── base/               # 基础模板（最小骨架）
├── sandbox/                # 清洗专用目录（原 YYC3 AI Call）
│   └── (每次 clean 会清空并填充)
└── cli/                    # 你的 @yyc3/cli 扩展
```

**关键点**：

- 每个模板是一个**可独立运行的 Next.js 项目**，但其 `package.json` 中的 `@yyc3/*` 依赖通过 `workspace:*` 指向本地包。
- `sandbox` 目录就是你指定的“清洗专用”目录，它永远不被提交到 Git，仅用于临时测试。
- 模板不包含 `node_modules`、`.next` 等构建产物。

---

## 三、模板内容规范

### 1. 基础模板 `base`

包含最干净的 Next.js + shadcn/ui + Radix UI + 已配置好的 `@yyc3/ui`、`@yyc3/core` 等。所有通用布局、主题、工具函数都来自共享包，模板内**不重复造轮子**。

示例 `templates/base/package.json`：

```json
{
  "name": "yyc3-template-base",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@yyc3/ui": "workspace:*",
    "@yyc3/core": "workspace:*",
    "@yyc3/ai-hub": "workspace:*",
    "@yyc3/motion": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@yyc3/config": "workspace:*",
    "tailwindcss": "^3.4.0"
  }
}
```

### 2. 派生模板（如 `dashboard`）

在 `base` 基础上增加：

- 特定的页面文件（如 `app/dashboard/page.tsx`）
- 特定的布局（修改 `app/layout.tsx`）
- 额外的配置文件（如 `tailwind.config.js` 的主题扩展）
- 特有的组件（如果尚未纳入 `@yyc3/ui`）

---

## 四、CLI 命令实现（扩展 `@yyc3/cli`）

你已有 CLI 基础，只需在 `packages/cli/src/commands/clean.ts` 中添加 `clean` 命令。

### 命令逻辑

```typescript
// 伪代码
async function clean(templateName: string, targetDir: string) {
  const templatesRoot = path.resolve(__dirname, '../../../templates');
  const templateDir = path.join(templatesRoot, templateName);
  if (!fs.existsSync(templateDir)) {
    throw new Error(`模板 "${templateName}" 不存在`);
  }

  // 1. 清空目标目录（保留 .git 等特殊文件）
  await emptyDirectory(targetDir, { keep: ['.git', '.env.local'] });

  // 2. 复制模板所有文件到目标目录
  await copyDir(templateDir, targetDir);

  // 3. 重新安装依赖（使用 pnpm，利用 workspace）
  await execa('pnpm', ['install'], { cwd: targetDir, stdio: 'inherit' });

  // 4. 可选：运行模板初始化脚本
  const initScript = path.join(targetDir, 'scripts/post-clean.js');
  if (fs.existsSync(initScript)) {
    await execa('node', [initScript], { cwd: targetDir });
  }

  console.log(`✅ 已应用模板 "${templateName}" 到 ${targetDir}`);
}
```

### 命令行注册

在 `packages/cli/src/index.ts` 中：

```typescript
program
  .command('clean')
  .description('将当前目录清洗为指定模板')
  .option('-t, --template <name>', '模板名称', process.env.YYC3_TEMPLATE || 'base')
  .action(async (options) => {
    const targetDir = process.cwd();
    await clean(options.template, targetDir);
  });
```

### 支持模板列表命令

```bash
yyc3 template list   # 列出所有可用模板
```

---

## 五、如何制作一个新模板（“清洗”现有项目为模板）

当你有一个满意的项目（比如你手头某个 AI 对话项目），想把它变成可复用的模板：

1. **在项目内移除所有业务特定数据**（API keys、用户数据、特定文案等）。
2. **确认所有通用组件/工具都已迁移到 `@yyc3/ui` 或 `@yyc3/core`**，否则会污染模板。
3. 运行命令：

   ```bash
   yyc3 template create my-new-template
   ```

   该命令会将当前目录复制到 `templates/my-new-template`，并自动修改 `package.json` 中的依赖为 `workspace:*` 协议。
4. 手动检查并精简模板文件（删除 `.git`、`node_modules` 等）。

---

## 六、立即落地步骤

### Step 1：创建模板仓库目录

```bash
cd /Volumes/Development/yyc3-platform
mkdir -p templates/base
```

### Step 2：构建一个干净的基础模板

使用你现有最纯净的项目（比如某个只包含 `@yyc3/ui` 和基本布局的最小项目），复制其所有文件到 `templates/base`，然后修改该模板的 `package.json`，将所有 `@yyc3/*` 依赖改为 `workspace:*`，并删除 `node_modules`、`.next`。

### Step 3：在 CLI 中实现 `clean` 命令

按照上述第四部分代码，在 `packages/cli/src/commands/clean.ts` 中实现。构建并全局链接你的 CLI：

```bash
cd packages/cli
pnpm build
pnpm link --global
```

### Step 4：测试清洗功能

```bash
cd /Volumes/Development/yyc3-platform
mkdir sandbox-test
cd sandbox-test
yyc3 clean --template base
pnpm dev   # 应成功启动一个干净的基础应用
```

### Step 5：将 `YYC3 AI Call` 目录正式设为 sandbox

```bash
mv "/Volumes/Development/yyc3-platform/YYC3 AI Call" "/Volumes/Development/yyc3-platform/sandbox"
cd /Volumes/Development/yyc3-platform/sandbox
yyc3 clean --template dashboard   # 瞬间变成仪表盘模板
```

---

## 七、扩展亮点：一键切换模板名称

你希望“只需要换路径最后的模版名称即可”。更优雅的方式是：

1. 在 `sandbox` 目录下创建一个 `.yyc3rc` 文件：
   ```json
   { "defaultTemplate": "dashboard" }
   ```
2. 然后只需要运行 `yyc3 clean` 不带参数，就会自动读取该配置。
3. 修改配置中的 `defaultTemplate` 值，再次运行 `yyc3 clean`，即完成模板切换。

---

## 八、与现有 CI/CD 集成

- 在 GitHub Actions 中，你可以添加一个定时任务，每周用基础模板重建 sandbox 并运行测试，确保共享包的兼容性。
- 每次发布新版本的 `@yyc3/*` 包后，自动触发 sandbox 的重建验证。

---

## 九、总结

这套方案让你：

- **不再手动复制项目**：一条命令即可获得任意模板。
- **模板即代码**：所有模板都存储在 Git 中，可版本化、可 diff。
- **彻底隔离工作区**：清洗专用目录永远可以被“重置”，不会污染你珍贵的原始项目。
- **符合你已有架构**：复用现有的 `@yyc3/cli` 和 workspace 机制，零额外成本。

你现在就可以从 `templates/base` 开始，逐步把你分析报告中识别的各类场景（admin-dashboard、AI-chat、landing、e-commerce 等）都提炼为独立模板。以后当你需要一个新的“即拉即用”项目时，只需要修改一下模板名称，再运行 `yyc3 clean`，几秒钟就能得到一个完全符合你标准的开发起点。

**下一步行动**：请确认你希望我直接生成完整的 `clean` 命令源码（基于你当前的 CLI 项目结构），或者先帮你构建第一个 `base` 模板的内容？告诉我，我将立即提供可执行代码。
