# 交互式分析脚本

将之前的分析、分类、重复检测功能封装成一个**交互式 CLI 脚本**，用户在终端中通过箭头键选择根路径，并输入具体的子目录（或留空分析整个根目录），然后自动运行全量分析并生成报告。

下面是完整的可运行脚本（保存为 `interactive-analyzer.js`）。它依赖 `inquirer`、`fast-glob`、`jschardet`（可选，但推荐安装）。运行前请确保已安装依赖：

```bash
npm install inquirer fast-glob jschardet
```

---

## 完整交互式分析脚本

```javascript
#!/usr/bin/env node

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const glob = require('fast-glob');
const inquirer = require('inquirer');
const jschardet = require('jschardet'); // 可选，用于编码检测

// ================== 1. 基础信息获取 ==================
async function getProjectDetails(projectPath, projectName) {
    let stats;
    let packageJson = {};
    let totalSize = 0;
    let totalFiles = 0;
    let fileHashes = [];

    const pkgPath = path.join(projectPath, 'package.json');
    try {
        const pkgContent = await fs.readFile(pkgPath, 'utf-8');
        packageJson = JSON.parse(pkgContent);
    } catch (err) {}

    try {
        const files = await glob('**/*', {
            cwd: projectPath,
            absolute: true,
            ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
        });
        totalFiles = files.length;
        const statsPromises = files.map(async file => {
            try {
                const fileStats = await fs.stat(file);
                totalSize += fileStats.size;
                if (fileHashes.length < 3) {
                    const content = await fs.readFile(file);
                    const hash = crypto.createHash('md5').update(content).digest('hex');
                    fileHashes.push(hash);
                }
            } catch (err) {}
        });
        await Promise.all(statsPromises);
    } catch (err) {}

    stats = await fs.stat(projectPath);
    const mtime = stats.mtime;

    return {
        name: projectName,
        packageJson,
        mtime,
        sizeMB: totalSize / (1024 * 1024),
        fileCount: totalFiles,
        version: packageJson.version || 'unknown',
        fileHashes
    };
}

// ================== 2. 技术栈与场景识别 ==================
function detectTechStack(projectDetails) {
    const { packageJson, projectPath, name: projectName } = projectDetails;
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    let framework = 'unknown';
    let category = 'general';

    if (deps.next) framework = 'Next.js';
    else if (deps.react) framework = 'React';
    else if (deps.vue) framework = 'Vue.js';
    else if (deps.angular) framework = 'Angular';
    else if (deps.express) framework = 'Express.js';

    const hasAppRouter = fsSync.existsSync(path.join(projectPath, 'app'));
    const hasPagesRouter = fsSync.existsSync(path.join(projectPath, 'pages'));
    if (framework === 'Next.js') {
        if (hasAppRouter) framework += ' (App Router)';
        else if (hasPagesRouter) framework += ' (Pages Router)';
    }

    let uiLibrary = 'none';
    if (deps['@radix-ui/react-dialog']) uiLibrary = 'Radix UI';
    if (deps['shadcn-ui']) uiLibrary += ' + shadcn/ui';

    let pkgManager = 'unknown';
    if (fsSync.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) pkgManager = 'pnpm';
    else if (fsSync.existsSync(path.join(projectPath, 'yarn.lock'))) pkgManager = 'yarn';
    else if (fsSync.existsSync(path.join(projectPath, 'package-lock.json'))) pkgManager = 'npm';

    const lowerName = projectName.toLowerCase();
    const depsKeys = Object.keys(deps).join(' ').toLowerCase();

    if (lowerName.includes('blog') || depsKeys.includes('blog')) category = 'Blog';
    else if (lowerName.includes('admin') || depsKeys.includes('admin')) category = 'Admin Dashboard';
    else if (lowerName.includes('ecommerce') || depsKeys.includes('shop') || depsKeys.includes('commerce')) category = 'E-commerce';
    else if (lowerName.includes('dashboard') || depsKeys.includes('dashboard')) category = 'Dashboard';
    else if (lowerName.includes('landing') || depsKeys.includes('landing')) category = 'Landing Page';
    else if (lowerName.includes('portfolio')) category = 'Portfolio';

    return { framework, category, uiLibrary, pkgManager };
}

// ================== 3. 重复性检测 ==================
async function findDuplicates(projects) {
    const duplicates = [];

    // 引擎1: 基于文件哈希
    const hashGroups = new Map();
    for (const project of projects) {
        const hashKey = project.fileHashes.sort().join('|');
        if (!hashGroups.has(hashKey)) hashGroups.set(hashKey, []);
        hashGroups.get(hashKey).push(project.name);
    }
    for (const [hashKey, nameList] of hashGroups.entries()) {
        if (nameList.length > 1 && hashKey !== '') {
            duplicates.push({
                type: 'file-structure-duplicate',
                confidence: 'medium',
                projects: nameList,
                reason: 'Similar file structure detected by MD5 hash analysis'
            });
        }
    }

    // 引擎2: 基于依赖相似度
    for (let i = 0; i < projects.length; i++) {
        for (let j = i + 1; j < projects.length; j++) {
            const p1 = projects[i];
            const p2 = projects[j];
            const deps1 = Object.keys(p1.packageJson.dependencies || {});
            const deps2 = Object.keys(p2.packageJson.dependencies || {});
            const commonDeps = deps1.filter(dep => deps2.includes(dep));
            const similarity = commonDeps.length / Math.max(deps1.length, deps2.length);

            if (similarity > 0.7 && deps1.length > 0 && deps2.length > 0) {
                duplicates.push({
                    type: 'dependency-similarity',
                    confidence: 'high',
                    projects: [p1.name, p2.name],
                    reason: `${Math.round(similarity * 100)}% dependency overlap (${commonDeps.length} common packages)`
                });
            }
        }
    }

    // 去重
    const uniqueDuplicates = [];
    const seenKeys = new Set();
    for (const dup of duplicates) {
        const key = `${dup.projects.sort().join('|')}|${dup.type}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueDuplicates.push(dup);
        }
    }
    return uniqueDuplicates;
}

// ================== 4. 主分析逻辑（接受根路径） ==================
async function analyzeRootDirectory(rootDir) {
    console.log(`🔍 开始扫描目录: ${rootDir}`);
    const dirs = await fs.readdir(rootDir);
    const projects = [];

    for (const dir of dirs) {
        const projectPath = path.join(rootDir, dir);
        try {
            const stat = await fs.stat(projectPath);
            if (stat.isDirectory() && !dir.startsWith('.')) {
                console.log(`   📁 分析中: ${dir}`);
                const details = await getProjectDetails(projectPath, dir);
                const techStack = detectTechStack({ ...details, projectPath });
                projects.push({
                    ...details,
                    ...techStack
                });
            }
        } catch (err) {}
    }

    console.log(`✅ 扫描完成，共分析 ${projects.length} 个项目`);

    if (projects.length === 0) {
        console.warn('⚠️ 未找到任何项目目录。');
        return;
    }

    console.log('🔗 检测重复项目...');
    const duplicates = await findDuplicates(projects);

    // 生成 Markdown 报告
    let markdown = '# 📊 项目分析报告\n\n';
    markdown += `> 根路径: ${rootDir}\n\n`;
    markdown += '## 📋 项目列表\n\n';
    markdown += '| 项目名称 | 使用场景 | 技术框架 | UI库 | 包管理器 | 最后修改 | 大小(MB) | 文件数 | Version |\n';
    markdown += '|----------|----------|----------|------|----------|----------|----------|--------|---------|\n';

    for (const p of projects) {
        markdown += `| ${p.name} | ${p.category} | ${p.framework} | ${p.uiLibrary} | ${p.pkgManager} | ${p.mtime.toISOString().split('T')[0]} | ${p.sizeMB.toFixed(2)} | ${p.fileCount} | ${p.version} |\n`;
    }

    markdown += '\n## 🔍 重复项目检测\n\n';
    if (duplicates.length === 0) {
        markdown += '未发现重复项目。\n';
    } else {
        for (const dup of duplicates) {
            markdown += `- **${dup.projects.join(' 与 ')}**\n`;
            markdown += `  - 重复类型: ${dup.type}\n`;
            markdown += `  - 置信度: ${dup.confidence}\n`;
            markdown += `  - 原因: ${dup.reason}\n\n`;
        }
    }

    const reportPath = path.join(process.cwd(), `analysis_${Date.now()}.md`);
    await fs.writeFile(reportPath, markdown, 'utf-8');
    console.log(`📄 报告已生成: ${reportPath}`);
}

// ================== 5. 交互式入口 ==================
async function interactive() {
    // 预定义根路径选项
    const rootChoices = [
        '/Volumes/Development',
        '/Volumes/YYC3-Mana',
        '/Volumes/Knowledge'
    ];

    const { rootPath } = await inquirer.prompt([
        {
            type: 'list',
            name: 'rootPath',
            message: '请选择根路径：',
            choices: rootChoices,
            default: rootChoices[0]
        }
    ]);

    // 检查根路径是否存在
    try {
        await fs.access(rootPath);
    } catch (e) {
        console.error(`❌ 路径不存在: ${rootPath}`);
        process.exit(1);
    }

    const { subPath } = await inquirer.prompt([
        {
            type: 'input',
            name: 'subPath',
            message: '请输入子目录名（相对于根路径，留空则分析整个根目录）：',
            default: ''
        }
    ]);

    let targetDir = rootPath;
    if (subPath && subPath.trim() !== '') {
        targetDir = path.join(rootPath, subPath);
        try {
            await fs.access(targetDir);
        } catch (e) {
            console.error(`❌ 子目录不存在: ${targetDir}`);
            process.exit(1);
        }
    }

    console.log(`\n🎯 目标目录: ${targetDir}\n`);
    await analyzeRootDirectory(targetDir);
}

// 执行交互
interactive().catch(console.error);
```

---

## 使用方法

1. 将上述代码保存为 `interactive-analyzer.js`（放在任意你方便的位置，比如项目根目录）。
2. 在终端中执行：

   ```bash
   node interactive-analyzer.js
   ```

3. 交互流程：
   - 使用上下箭头选择根路径：`/Volumes/Development`、`/Volumes/YYC3-Mana` 或 `/Volumes/Knowledge`。
   - 输入子目录名（例如 `projects`、`AI-Family-DveOps` 等）。如果留空，则分析整个选中的根路径。
   - 脚本自动扫描所有子目录（跳过 `node_modules`、`.git`、`dist` 等），进行技术栈分类、场景识别和重复检测。
   - 最终生成 `analysis_时间戳.md` 报告文件。

---

## 扩展与定制

- **增加更多根路径**：只需修改 `rootChoices` 数组。
- **修改忽略目录**：在 `glob` 的 `ignore` 参数中添加更多模式。
- **调整重复检测阈值**：修改 `similarity > 0.7` 中的 `0.7` 即可。
- **缓存文件哈希**：如果你需要更精确的重复检测，可以计算所有文件的哈希，但会显著降低速度。当前实现只取前3个文件，适合快速识别。

---

## 与现有分析工具的衔接

此脚本已完全复用了你之前 `index.js` 中的所有核心功能（依赖扫描、技术栈识别、分类、重复检测），并扩展了交互式路径选择。你可以直接把它当作一个独立的工具使用，不需要再手动编辑根路径。

**注**：如果你希望保留原来的一次性分析脚本，可以另存为新文件。两者不冲突。

这套交互式工具将彻底解决你“每次手动修改路径、重复运行”的痛点，实现真正的“选择即分析”。
