基于现有的 CLI 项目结构（使用 `commander`、`chalk`、`execa`、`fs-extra` 等），以下是一套**可直接复制粘贴**的 `clean` 命令完整源码。

---

## 一、安装必要依赖（如果尚未安装）

```bash
cd packages/cli
pnpm add -D execa fs-extra @types/fs-extra
```

---

## 二、创建 `src/commands/clean.ts`

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 模板根目录（相对于 CLI 包的位置，根据你的 Monorepo 结构调整）
// 这里假设 templates 目录位于 monorepo 根目录下，与 packages 同级
const TEMPLATES_ROOT = path.resolve(__dirname, '../../../templates');

interface CleanOptions {
  template: string;
  force?: boolean;
}

/**
 * 清空目录（保留指定文件/文件夹）
 */
async function cleanDirectory(dir: string, keep: string[] = []) {
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    if (keep.includes(entry)) continue;
    const fullPath = path.join(dir, entry);
    await fs.remove(fullPath);
  }
}

/**
 * 递归复制目录，忽略指定模式
 */
async function copyTemplate(src: string, dest: string, ignorePatterns: string[] = ['node_modules', '.next', '.git', 'dist', 'build']) {
  await fs.ensureDir(dest);
  const items = await fs.readdir(src);
  for (const item of items) {
    if (ignorePatterns.some(pattern => item === pattern || item.startsWith(pattern))) continue;
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = await fs.stat(srcPath);
    if (stat.isDirectory()) {
      await copyTemplate(srcPath, destPath, ignorePatterns);
    } else {
      await fs.copy(srcPath, destPath);
    }
  }
}

/**
 * 更新 package.json 中的 workspace 协议（确保所有 @yyc3/* 依赖使用 workspace:*）
 */
async function fixWorkspaceProtocols(targetDir: string) {
  const pkgPath = path.join(targetDir, 'package.json');
  if (!await fs.pathExists(pkgPath)) return;

  const pkg = await fs.readJson(pkgPath);
  const updateDeps = (deps: Record<string, string>) => {
    if (!deps) return;
    for (const [name, version] of Object.entries(deps)) {
      if (name.startsWith('@yyc3/') && version !== 'workspace:*') {
        deps[name] = 'workspace:*';
      }
    }
  };

  updateDeps(pkg.dependencies);
  updateDeps(pkg.devDependencies);
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });
}

/**
 * 执行模板清洗
 */
export async function cleanCommand(options: CleanOptions, targetDir: string = process.cwd()) {
  const templateName = options.template.toLowerCase();
  const templateDir = path.join(TEMPLATES_ROOT, templateName);

  // 1. 检查模板是否存在
  if (!await fs.pathExists(templateDir)) {
    console.error(chalk.red(`❌ 模板不存在: ${templateName}`));
    console.log(chalk.yellow(`可用模板: ${await listAvailableTemplates()}`));
    process.exit(1);
  }

  // 2. 检查目标目录是否为 git 仓库根目录（可选保护）
  const isGitRepo = await fs.pathExists(path.join(targetDir, '.git'));
  if (!options.force && isGitRepo) {
    console.warn(chalk.yellow('⚠️ 目标目录是一个 Git 仓库，清洗会删除所有未跟踪文件。'));
    console.warn(chalk.yellow('   如需继续，请添加 --force 参数。'));
    process.exit(1);
  }

  // 3. 确认操作（交互式确认，除非使用了 --force）
  if (!options.force) {
    const { default: inquirer } = await import('inquirer');
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `即将清空当前目录并替换为模板 "${templateName}"，是否继续？`,
        default: false,
      },
    ]);
    if (!confirm) {
      console.log(chalk.gray('操作已取消。'));
      process.exit(0);
    }
  }

  // 4. 清空目标目录（保留 .git, .env.local, .env 等）
  console.log(chalk.blue('🧹 正在清空目录...'));
  await cleanDirectory(targetDir, ['.git', '.env.local', '.env']);

  // 5. 复制模板文件
  console.log(chalk.blue(`📋 正在应用模板: ${templateName}`));
  await copyTemplate(templateDir, targetDir);

  // 6. 修复 workspace 协议（重要：确保本地包链接正确）
  await fixWorkspaceProtocols(targetDir);

  // 7. 重新安装依赖
  console.log(chalk.blue('📦 正在安装依赖（利用 pnpm workspace）...'));
  await execa('pnpm', ['install'], { cwd: targetDir, stdio: 'inherit' });

  // 8. 可选：执行模板内的初始化钩子（如果存在 scripts/post-clean.js）
  const postCleanScript = path.join(targetDir, 'scripts/post-clean.js');
  if (await fs.pathExists(postCleanScript)) {
    console.log(chalk.blue('▶️ 正在执行模板初始化脚本...'));
    await execa('node', [postCleanScript], { cwd: targetDir, stdio: 'inherit' });
  }

  console.log(chalk.green(`✅ 清洗完成！当前目录已应用模板 "${templateName}"`));
  console.log(chalk.cyan('💡 运行 pnpm dev 即可启动项目'));
}

/**
 * 列出所有可用模板
 */
async function listAvailableTemplates(): Promise<string> {
  if (!await fs.pathExists(TEMPLATES_ROOT)) return '(无)';
  const dirs = await fs.readdir(TEMPLATES_ROOT);
  const templates = dirs.filter(d => fs.statSync(path.join(TEMPLATES_ROOT, d)).isDirectory());
  return templates.join(', ') || '(无)';
}

/**
 * 注册 clean 命令
 */
export function registerCleanCommand(program: Command) {
  program
    .command('clean')
    .description('将当前目录清洗为指定模板（保留 .git/.env 等）')
    .option('-t, --template <name>', '模板名称', process.env.YYC3_TEMPLATE || 'base')
    .option('-f, --force', '强制执行（跳过 Git 警告）')
    .action(async (options: CleanOptions) => {
      try {
        await cleanCommand(options);
      } catch (error) {
        console.error(chalk.red('清洗过程中发生错误:'), error);
        process.exit(1);
      }
    });
}
```

---

## 三、修改 CLI 入口 `bin/yyc3-cli.js` 或 `src/index.ts`

在你的 CLI 主入口文件中，导入并注册该命令。假设你已有类似结构：

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { registerCleanCommand } from '../src/commands/clean.js';

const program = new Command();

// ... 其他命令注册

registerCleanCommand(program);

program.parse();
```

如果你的入口是 `bin/yyc3-cli.js`（CommonJS），请使用动态导入：

```javascript
#!/usr/bin/env node
const { Command } = require('commander');
const program = new Command();

// 动态导入 ES module
import('../dist/commands/clean.js').then(({ registerCleanCommand }) => {
  registerCleanCommand(program);
  program.parse();
});
```

---

## 四、准备模板目录结构

在 monorepo 根目录下创建 `templates/base` 作为基础模板。你可以从现有的干净项目（例如 `YYC³-3` 精简后）复制内容，但必须确保：

- `package.json` 中的所有 `@yyc3/*` 依赖使用 `workspace:*` 协议（稍后 CLI 也会自动修复，但最好预先设好）。
- 不包含 `node_modules`、`.next`、`dist` 等构建物。
- 包含一个完整的 Next.js 应用结构（`app/`, `public/`, `next.config.js` 等）。

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

---

## 五、测试

```bash
# 1. 构建 CLI
cd packages/cli
pnpm build

# 2. 全局链接测试
pnpm link --global

# 3. 创建沙箱目录
cd /Volumes/Development/yyc3-platform
mkdir sandbox-test
cd sandbox-test

# 4. 使用基础模板清洗
yyc3 clean --template base

# 5. 启动验证
pnpm dev
```

---

## 六、扩展建议

### 1. 支持从 URL 拉取模板（远程模板）

未来可以扩展 `clean` 命令，支持从 GitHub 仓库直接下载模板：

```bash
yyc3 clean --template https://github.com/yyc3/templates/ai-chat
```

### 2. 模板版本管理

在 `templates/base/template.config.json` 中定义模板元数据：

```json
{
  "name": "base",
  "version": "1.0.0",
  "description": "干净的基础模板",
  "minCliVersion": "1.0.0"
}
```

`clean` 命令可以检查 CLI 版本兼容性。

### 3. 增量更新（不破坏自定义文件）

如果你希望在现有项目上仅更新框架部分而不删除业务文件，可以实现 `yyc3 update` 命令，原理类似但只替换共享部分（通过比对 `template.config.json` 中标记的“框架文件”列表）。

---

这套 `clean` 命令已完整覆盖你的需求：**一行命令换模板，仅修改路径最后的模板名称即可**。你现在可以立即将 `YYC3 AI Call` 目录作为清洗专用目录，愉快地体验模板化开发的效率跃升。
