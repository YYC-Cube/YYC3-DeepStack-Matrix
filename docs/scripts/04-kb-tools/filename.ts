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
