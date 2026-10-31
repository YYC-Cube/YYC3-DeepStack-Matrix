// index.js
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const glob = require('fast-glob');
const jschardet = require('jschardet');

// ---------- 1. 基础信息获取 ----------
async function getProjectDetails(projectPath, projectName) {
    let stats;
    let packageJson = {};
    let totalSize = 0;
    let totalFiles = 0;
    let fileHashes = [];

    // 检测 package.json
    const pkgPath = path.join(projectPath, 'package.json');
    try {
        const pkgContent = await fs.readFile(pkgPath, 'utf-8');
        packageJson = JSON.parse(pkgContent);
    } catch (err) {}

    // 异步遍历计算总大小和文件哈希 (取前3个文件做代表)
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

// ---------- 2. 技术栈与场景识别 ----------
function detectTechStack(projectDetails) {
    const { packageJson, projectPath, name: projectName } = projectDetails;
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    let framework = 'unknown';
    let category = 'general';

    // 框架识别
    if (deps.next) framework = 'Next.js';
    else if (deps.react) framework = 'React';
    else if (deps.vue) framework = 'Vue.js';
    else if (deps.angular) framework = 'Angular';
    else if (deps.express) framework = 'Express.js';

    // 增强：通过配置文件进一步判断
    const hasAppRouter = fsSync.existsSync(path.join(projectPath, 'app'));
    const hasPagesRouter = fsSync.existsSync(path.join(projectPath, 'pages'));
    if (framework === 'Next.js') {
        if (hasAppRouter) framework += ' (App Router)';
        else if (hasPagesRouter) framework += ' (Pages Router)';
    }

    // UI 库识别
    let uiLibrary = 'none';
    if (deps['@radix-ui/react-dialog']) uiLibrary = 'Radix UI';
    if (deps['shadcn-ui']) uiLibrary += ' + shadcn/ui';

    // 包管理器识别
    let pkgManager = 'unknown';
    if (fsSync.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) pkgManager = 'pnpm';
    else if (fsSync.existsSync(path.join(projectPath, 'yarn.lock'))) pkgManager = 'yarn';
    else if (fsSync.existsSync(path.join(projectPath, 'package-lock.json'))) pkgManager = 'npm';

    // 场景识别 (适用于你的 Next.js + React 项目)
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

// ---------- 3. 重复性检测 (双引擎：秒级哈希 + 分钟级相似度) ----------
async function findDuplicates(projects) {
    const duplicates = [];

    // 引擎1: 快速检测 (基于 MD5 文件哈希)
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

    // 引擎2: 相似度匹配 (基于依赖树)
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

// ---------- 4. 主线程 ----------
async function main() {
    console.log('🔍 开始扫描项目...');
    const currentDir = process.cwd();
    const dirs = await fs.readdir(currentDir);
    const projects = [];

    for (const dir of dirs) {
        const projectPath = path.join(currentDir, dir);
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

    // 检测重复项目
    console.log('🔗 检测重复项目...');
    const duplicates = await findDuplicates(projects);

    // 生成 Markdown 报告
    let markdown = '# 📊 项目分析报告\n\n';
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

    const reportPath = path.join(currentDir, 'project_analysis_report.md');
    await fs.writeFile(reportPath, markdown, 'utf-8');
    console.log(`📄 报告已生成: ${reportPath}`);
}

main().catch(console.error);
