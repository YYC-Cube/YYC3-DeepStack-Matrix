#!/usr/bin/env node

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const glob = require('fast-glob');
const _inquirer = require('inquirer');
const inquirer = _inquirer.default || _inquirer;
const Separator = inquirer.Separator;
const prompt = inquirer.prompt;

const CONFIG_FILE = path.join(__dirname, '.analyzer-config.json');
const BACK_SYMBOL = '↩ 0. 返回上一级';
const BACK_VALUE = '__BACK__';

const DEFAULT_CONFIG = {
    rootPaths: [
        '/Volumes/Development',
        '/Volumes/YYC3-Mana',
        '/Volumes/Knowledge'
    ],
    ignorePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/.cache/**',
        '**/*.log'
    ],
    similarityThreshold: 0.7,
    hashDepth: 3,
    reportFormat: 'markdown',
    reportDir: '',
    deepScan: false,
    autoOpenReport: false,
    maxConcurrency: 20
};

const THRESHOLD_OPTIONS = [
    { name: '宽松 — 50%（更易标记为重复，适合粗筛）', value: 0.5 },
    { name: '适中 — 60%', value: 0.6 },
    { name: '标准 — 70%（推荐）', value: 0.7 },
    { name: '严格 — 80%', value: 0.8 },
    { name: '极严 — 90%（仅高相似度才标记）', value: 0.9 }
];

const HASH_DEPTH_OPTIONS = [
    { name: '快速 — 前 3 个文件（速度快，适合粗筛）', value: 3 },
    { name: '均衡 — 前 10 个文件', value: 10 },
    { name: '深入 — 前 30 个文件', value: 30 },
    { name: '全面 — 前 100 个文件', value: 100 },
    { name: '完整 — 所有文件（最精确，速度慢）', value: Infinity }
];

const REPORT_FORMAT_OPTIONS = [
    { name: 'Markdown (.md)', value: 'markdown' },
    { name: 'JSON (.json)', value: 'json' },
    { name: 'CSV (.csv)', value: 'csv' },
    { name: '全部格式', value: 'all' }
];

const IGNORE_PRESETS = {
    node: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**', '**/coverage/**', '**/.cache/**'],
    python: ['**/__pycache__/**', '**/.venv/**', '**/venv/**', '**/*.pyc', '**/.git/**', '**/dist/**'],
    java: ['**/target/**', '**/.gradle/**', '**/.mvn/**', '**/.git/**', '**/build/**'],
    all: [
        '**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**',
        '**/.next/**', '**/coverage/**', '**/.cache/**',
        '**/__pycache__/**', '**/.venv/**', '**/venv/**', '**/*.pyc',
        '**/target/**', '**/.gradle/**', '**/.mvn/**',
        '**/.DS_Store', '**/Thumbs.db', '**/*.log'
    ]
};

async function loadConfig() {
    try {
        const content = await fs.readFile(CONFIG_FILE, 'utf-8');
        const saved = JSON.parse(content);
        return { ...DEFAULT_CONFIG, ...saved };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

async function saveConfig(config) {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function makeChoices(items, addBack = true) {
    const choices = items.map(item => (typeof item === 'string' ? { name: item, value: item } : item));
    if (addBack) {
        choices.push(new Separator());
        choices.push({ name: BACK_SYMBOL, value: BACK_VALUE });
    }
    return choices;
}

async function confirmAction(message, defaultValue = true) {
    const { ok } = await prompt([{
        type: 'confirm', name: 'ok', message, default: defaultValue
    }]);
    return ok;
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const min = Math.floor(ms / 60000);
    const sec = ((ms % 60000) / 1000).toFixed(0);
    return `${min}m ${sec}s`;
}

async function getProjectDetails(projectPath, projectName, config) {
    let packageJson = {};
    let totalSize = 0;
    let totalFiles = 0;
    let fileHashes = [];
    let codeFiles = 0;
    let codeLines = 0;
    let extensions = {};

    const pkgPath = path.join(projectPath, 'package.json');
    try {
        const pkgContent = await fs.readFile(pkgPath, 'utf-8');
        packageJson = JSON.parse(pkgContent);
    } catch {}

    try {
        const files = await glob('**/*', {
            cwd: projectPath,
            absolute: true,
            ignore: config.ignorePatterns,
            stats: true
        });
        totalFiles = files.length;

        const batchSize = config.maxConcurrency || 20;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            await Promise.all(batch.map(async (fileEntry) => {
                try {
                    const filePath = typeof fileEntry === 'string' ? fileEntry : fileEntry.path;
                    const fileStats = typeof fileEntry === 'string' ? await fs.stat(filePath) : fileEntry.stats || await fs.stat(filePath);
                    totalSize += fileStats.size;

                    const ext = path.extname(filePath).toLowerCase();
                    if (ext) {
                        extensions[ext] = (extensions[ext] || 0) + 1;
                    }

                    const codeExts = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.css', '.scss', '.less', '.html', '.sql'];
                    if (codeExts.includes(ext)) {
                        codeFiles++;
                        try {
                            const content = await fs.readFile(filePath, 'utf-8');
                            codeLines += content.split('\n').length;
                        } catch {}
                    }

                    const hashLimit = config.hashDepth === Infinity ? Infinity : config.hashDepth;
                    if (fileHashes.length < hashLimit) {
                        const content = await fs.readFile(filePath);
                        const hash = crypto.createHash('md5').update(content).digest('hex');
                        fileHashes.push(hash);
                    }
                } catch {}
            }));
        }
    } catch {}

    let stats;
    try {
        stats = await fs.stat(projectPath);
    } catch {
        stats = { mtime: new Date() };
    }

    return {
        name: projectName,
        packageJson,
        mtime: stats.mtime,
        sizeMB: totalSize / (1024 * 1024),
        totalSizeBytes: totalSize,
        fileCount: totalFiles,
        codeFiles,
        codeLines,
        extensions,
        version: packageJson.version || 'unknown',
        fileHashes
    };
}

function detectTechStack(projectDetails) {
    const { packageJson, projectPath, name: projectName } = projectDetails;
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    let framework = 'unknown';
    let category = 'general';
    const languages = [];

    if (deps.next) framework = 'Next.js';
    else if (deps.nuxt) framework = 'Nuxt.js';
    else if (deps.react) framework = 'React';
    else if (deps.vue) framework = 'Vue.js';
    else if (deps.angular || deps['@angular/core']) framework = 'Angular';
    else if (deps.svelte) framework = 'Svelte';
    else if (deps.express) framework = 'Express.js';
    else if (deps.koa) framework = 'Koa.js';
    else if (deps.fastify) framework = 'Fastify';
    else if (deps.nestjs || deps['@nestjs/core']) framework = 'NestJS';
    else if (deps.flask || deps.django) framework = deps.flask ? 'Flask' : 'Django';
    else if (deps.springboot) framework = 'Spring Boot';

    const hasAppRouter = fsSync.existsSync(path.join(projectPath, 'app'));
    const hasPagesRouter = fsSync.existsSync(path.join(projectPath, 'pages'));
    if (framework === 'Next.js') {
        if (hasAppRouter) framework += ' (App Router)';
        else if (hasPagesRouter) framework += ' (Pages Router)';
    }

    let uiLibrary = 'none';
    if (deps['@radix-ui/react-dialog'] || deps['@radix-ui/react-popover']) uiLibrary = 'Radix UI';
    if (deps['shadcn-ui'] || deps['@shadcn/ui']) uiLibrary += ' + shadcn/ui';
    if (deps.antd || deps['ant-design']) uiLibrary = 'Ant Design';
    if (deps['@mui/material']) uiLibrary = 'Material UI';
    if (deps['@chakra-ui/react']) uiLibrary = 'Chakra UI';
    if (deps['element-plus'] || deps['element-ui']) uiLibrary = 'Element UI';

    let pkgManager = 'unknown';
    if (fsSync.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) pkgManager = 'pnpm';
    else if (fsSync.existsSync(path.join(projectPath, 'yarn.lock'))) pkgManager = 'yarn';
    else if (fsSync.existsSync(path.join(projectPath, 'bun.lockb'))) pkgManager = 'bun';
    else if (fsSync.existsSync(path.join(projectPath, 'package-lock.json'))) pkgManager = 'npm';

    const exts = Object.keys(projectDetails.extensions || {});
    if (exts.some(e => ['.ts', '.tsx'].includes(e))) languages.push('TypeScript');
    if (exts.some(e => ['.js', '.jsx'].includes(e))) languages.push('JavaScript');
    if (exts.some(e => ['.vue'].includes(e))) languages.push('Vue');
    if (exts.some(e => ['.py'].includes(e))) languages.push('Python');
    if (exts.some(e => ['.java'].includes(e))) languages.push('Java');
    if (exts.some(e => ['.go'].includes(e))) languages.push('Go');
    if (exts.some(e => ['.rs'].includes(e))) languages.push('Rust');
    if (languages.length === 0) languages.push('Unknown');

    const lowerName = projectName.toLowerCase();
    const depsKeys = Object.keys(deps).join(' ').toLowerCase();

    if (lowerName.includes('blog') || depsKeys.includes('blog')) category = 'Blog';
    else if (lowerName.includes('admin') || depsKeys.includes('admin')) category = 'Admin Dashboard';
    else if (lowerName.includes('ecommerce') || depsKeys.includes('shop') || depsKeys.includes('commerce')) category = 'E-commerce';
    else if (lowerName.includes('dashboard') || depsKeys.includes('dashboard')) category = 'Dashboard';
    else if (lowerName.includes('landing') || depsKeys.includes('landing')) category = 'Landing Page';
    else if (lowerName.includes('portfolio')) category = 'Portfolio';
    else if (lowerName.includes('api') || depsKeys.includes('rest') || depsKeys.includes('graphql')) category = 'API Service';
    else if (lowerName.includes('cli') || depsKeys.includes('commander') || depsKeys.includes('yargs')) category = 'CLI Tool';
    else if (lowerName.includes('component') || depsKeys.includes('storybook')) category = 'Component Library';
    else if (lowerName.includes('doc') || depsKeys.includes('docusaurus') || depsKeys.includes('vitepress')) category = 'Documentation';

    const hasDockerfile = fsSync.existsSync(path.join(projectPath, 'Dockerfile'));
    const hasCI = fsSync.existsSync(path.join(projectPath, '.github')) || fsSync.existsSync(path.join(projectPath, '.gitlab-ci.yml'));
    const hasEnvExample = fsSync.existsSync(path.join(projectPath, '.env.example'));
    const hasReadme = fsSync.existsSync(path.join(projectPath, 'README.md'));
    const hasLicense = fsSync.existsSync(path.join(projectPath, 'LICENSE')) || fsSync.existsSync(path.join(projectPath, 'LICENSE.md'));

    return {
        framework, category, uiLibrary, pkgManager, languages,
        indicators: { hasDockerfile, hasCI, hasEnvExample, hasReadme, hasLicense }
    };
}

async function findDuplicates(projects, threshold) {
    const duplicates = [];

    const hashGroups = new Map();
    for (const project of projects) {
        if (project.fileHashes.length === 0) continue;
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

    for (let i = 0; i < projects.length; i++) {
        for (let j = i + 1; j < projects.length; j++) {
            const p1 = projects[i];
            const p2 = projects[j];
            const deps1 = Object.keys(p1.packageJson.dependencies || {});
            const deps2 = Object.keys(p2.packageJson.dependencies || {});
            const devDeps1 = Object.keys(p1.packageJson.devDependencies || {});
            const devDeps2 = Object.keys(p2.packageJson.devDependencies || {});
            const allDeps1 = [...deps1, ...devDeps1];
            const allDeps2 = [...deps2, ...devDeps2];
            const commonDeps = allDeps1.filter(dep => allDeps2.includes(dep));
            const similarity = allDeps1.length > 0 && allDeps2.length > 0
                ? commonDeps.length / Math.max(allDeps1.length, allDeps2.length)
                : 0;

            if (similarity > threshold && allDeps1.length > 0 && allDeps2.length > 0) {
                const commonList = commonDeps.slice(0, 10).join(', ') + (commonDeps.length > 10 ? '...' : '');
                duplicates.push({
                    type: 'dependency-similarity',
                    confidence: similarity > 0.9 ? 'critical' : similarity > 0.8 ? 'high' : 'medium',
                    projects: [p1.name, p2.name],
                    similarity: Math.round(similarity * 100),
                    reason: `${Math.round(similarity * 100)}% dependency overlap (${commonDeps.length} common packages: ${commonList})`
                });
            }
        }
    }

    for (let i = 0; i < projects.length; i++) {
        for (let j = i + 1; j < projects.length; j++) {
            const name1 = projects[i].name.toLowerCase();
            const name2 = projects[j].name.toLowerCase();
            const maxLen = Math.max(name1.length, name2.length);
            let matches = 0;
            for (let k = 0; k < Math.min(name1.length, name2.length); k++) {
                if (name1[k] === name2[k]) matches++;
            }
            const nameSimilarity = matches / maxLen;
            if (nameSimilarity > 0.8 && name1 !== name2) {
                const existing = duplicates.find(d =>
                    d.type === 'name-similarity' &&
                    d.projects.includes(projects[i].name) &&
                    d.projects.includes(projects[j].name)
                );
                if (!existing) {
                    duplicates.push({
                        type: 'name-similarity',
                        confidence: 'low',
                        projects: [projects[i].name, projects[j].name],
                        similarity: Math.round(nameSimilarity * 100),
                        reason: `Project names are ${Math.round(nameSimilarity * 100)}% similar`
                    });
                }
            }
        }
    }

    const uniqueDuplicates = [];
    const seenKeys = new Set();
    for (const dup of duplicates) {
        const key = `${dup.projects.sort().join('|')}|${dup.type}`;
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueDuplicates.push(dup);
        }
    }
    return uniqueDuplicates.sort((a, b) => {
        const confOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (confOrder[a.confidence] || 99) - (confOrder[b.confidence] || 99);
    });
}

function generateMarkdownReport(rootDir, projects, duplicates, config, elapsed) {
    let md = '# 📊 YYC³ 项目分析报告\n\n';
    md += `> **扫描路径**: ${rootDir}\n`;
    md += `> **分析时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n`;
    md += `> **耗时**: ${formatDuration(elapsed)}\n`;
    md += `> **项目数量**: ${projects.length}\n`;
    md += `> **检测阈值**: ${Math.round(config.similarityThreshold * 100)}%\n`;
    md += `> **哈希深度**: ${config.hashDepth === Infinity ? '全部文件' : `前 ${config.hashDepth} 个文件`}\n\n`;

    md += '---\n\n## 📋 项目总览\n\n';
    md += '| # | 项目名称 | 场景分类 | 技术框架 | 语言 | UI库 | 包管理器 | 大小 | 文件数 | 代码行 | 版本 |\n';
    md += '|---|----------|----------|----------|------|------|----------|------|--------|--------|------|\n';

    projects.forEach((p, idx) => {
        md += `| ${idx + 1} | ${p.name} | ${p.category} | ${p.framework} | ${p.languages.join(', ')} | ${p.uiLibrary} | ${p.pkgManager} | ${formatSize(p.totalSizeBytes)} | ${p.fileCount} | ${p.codeLines.toLocaleString()} | ${p.version} |\n`;
    });

    const totalSize = projects.reduce((s, p) => s + p.totalSizeBytes, 0);
    const totalFiles = projects.reduce((s, p) => s + p.fileCount, 0);
    const totalCodeLines = projects.reduce((s, p) => s + p.codeLines, 0);
    md += `\n> **汇总**: 总大小 ${formatSize(totalSize)}, 总文件数 ${totalFiles.toLocaleString()}, 总代码行 ${totalCodeLines.toLocaleString()}\n`;

    md += '\n---\n\n## 📊 技术栈分布\n\n';
    const fwCount = {};
    projects.forEach(p => { fwCount[p.framework] = (fwCount[p.framework] || 0) + 1; });
    md += '| 技术框架 | 项目数 | 占比 |\n|----------|--------|------|\n';
    Object.entries(fwCount).sort((a, b) => b[1] - a[1]).forEach(([fw, count]) => {
        md += `| ${fw} | ${count} | ${Math.round(count / projects.length * 100)}% |\n`;
    });

    const catCount = {};
    projects.forEach(p => { catCount[p.category] = (catCount[p.category] || 0) + 1; });
    md += '\n### 场景分类分布\n\n';
    md += '| 场景分类 | 项目数 | 占比 |\n|----------|--------|------|\n';
    Object.entries(catCount).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
        md += `| ${cat} | ${count} | ${Math.round(count / projects.length * 100)}% |\n`;
    });

    md += '\n---\n\n## 🏗 项目健康度\n\n';
    md += '| 项目 | Dockerfile | CI/CD | .env.example | README | License |\n';
    md += '|------|-----------|-------|-------------|--------|--------|\n';
    projects.forEach(p => {
        const ind = p.indicators;
        md += `| ${p.name} | ${ind.hasDockerfile ? '✅' : '❌'} | ${ind.hasCI ? '✅' : '❌'} | ${ind.hasEnvExample ? '✅' : '❌'} | ${ind.hasReadme ? '✅' : '❌'} | ${ind.hasLicense ? '✅' : '❌'} |\n`;
    });

    md += '\n---\n\n## 🔍 重复项目检测\n\n';
    if (duplicates.length === 0) {
        md += '✅ 未发现重复项目。\n';
    } else {
        const critCount = duplicates.filter(d => d.confidence === 'critical').length;
        const highCount = duplicates.filter(d => d.confidence === 'high').length;
        const medCount = duplicates.filter(d => d.confidence === 'medium').length;
        const lowCount = duplicates.filter(d => d.confidence === 'low').length;
        md += `> 发现 **${duplicates.length}** 组重复项目: `;
        const parts = [];
        if (critCount) parts.push(`🔴 严重 ${critCount}`);
        if (highCount) parts.push(`🟠 高 ${highCount}`);
        if (medCount) parts.push(`🟡 中 ${medCount}`);
        if (lowCount) parts.push(`🟢 低 ${lowCount}`);
        md += parts.join(', ') + '\n\n';

        duplicates.forEach(dup => {
            const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[dup.confidence] || '⚪';
            md += `### ${icon} ${dup.projects.join(' ↔ ')}\n\n`;
            md += `- **检测类型**: ${dup.type}\n`;
            md += `- **置信度**: ${dup.confidence}${dup.similarity ? ` (${dup.similarity}%)` : ''}\n`;
            md += `- **详情**: ${dup.reason}\n\n`;
        });
    }

    md += '---\n\n## 📄 文件类型分布\n\n';
    const allExts = {};
    projects.forEach(p => {
        Object.entries(p.extensions || {}).forEach(([ext, count]) => {
            allExts[ext] = (allExts[ext] || 0) + count;
        });
    });
    const sortedExts = Object.entries(allExts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    md += '| 扩展名 | 文件数 |\n|--------|--------|\n';
    sortedExts.forEach(([ext, count]) => {
        md += `| ${ext || '(无扩展名)'} | ${count.toLocaleString()} |\n`;
    });

    md += '\n---\n\n';
    md += '> Generated by **YYC³ Interactive Analyzer**\n';
    md += '> © 2025-2026 YanYuCloudCube™. All Rights Reserved.\n';

    return md;
}

function generateJsonReport(rootDir, projects, duplicates, config, elapsed) {
    return JSON.stringify({
        meta: {
            rootDir,
            timestamp: new Date().toISOString(),
            elapsedMs: elapsed,
            config: {
                similarityThreshold: config.similarityThreshold,
                hashDepth: config.hashDepth,
                ignorePatterns: config.ignorePatterns
            }
        },
        summary: {
            totalProjects: projects.length,
            totalSize: projects.reduce((s, p) => s + p.totalSizeBytes, 0),
            totalFiles: projects.reduce((s, p) => s + p.fileCount, 0),
            totalCodeLines: projects.reduce((s, p) => s + p.codeLines, 0),
            duplicateGroups: duplicates.length
        },
        projects: projects.map(p => ({
            name: p.name,
            category: p.category,
            framework: p.framework,
            languages: p.languages,
            uiLibrary: p.uiLibrary,
            pkgManager: p.pkgManager,
            size: p.totalSizeBytes,
            sizeHuman: formatSize(p.totalSizeBytes),
            fileCount: p.fileCount,
            codeFiles: p.codeFiles,
            codeLines: p.codeLines,
            version: p.version,
            lastModified: p.mtime.toISOString(),
            indicators: p.indicators,
            topExtensions: Object.entries(p.extensions || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
        })),
        duplicates
    }, null, 2);
}

function generateCsvReport(projects) {
    const headers = ['项目名称', '场景分类', '技术框架', '语言', 'UI库', '包管理器', '大小(B)', '文件数', '代码文件数', '代码行数', '版本', '最后修改', 'Dockerfile', 'CI/CD', 'README', 'License'];
    const rows = projects.map(p => [
        p.name, p.category, p.framework, p.languages.join(';'),
        p.uiLibrary, p.pkgManager, p.totalSizeBytes, p.fileCount,
        p.codeFiles, p.codeLines, p.version,
        p.mtime.toISOString().split('T')[0],
        p.indicators.hasDockerfile ? 'Yes' : 'No',
        p.indicators.hasCI ? 'Yes' : 'No',
        p.indicators.hasReadme ? 'Yes' : 'No',
        p.indicators.hasLicense ? 'Yes' : 'No'
    ]);
    return [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

async function writeReport(rootDir, projects, duplicates, config, elapsed) {
    const reportDir = config.reportDir || process.cwd();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const formats = config.reportFormat === 'all'
        ? ['markdown', 'json', 'csv']
        : [config.reportFormat];

    const written = [];

    for (const fmt of formats) {
        let content, filename;
        switch (fmt) {
            case 'markdown':
                content = generateMarkdownReport(rootDir, projects, duplicates, config, elapsed);
                filename = `analysis_${timestamp}.md`;
                break;
            case 'json':
                content = generateJsonReport(rootDir, projects, duplicates, config, elapsed);
                filename = `analysis_${timestamp}.json`;
                break;
            case 'csv':
                content = generateCsvReport(projects);
                filename = `analysis_${timestamp}.csv`;
                break;
        }
        const filePath = path.join(reportDir, filename);
        await fs.writeFile(filePath, content, 'utf-8');
        written.push(filePath);
    }

    return written;
}

async function analyzeRootDirectory(rootDir, config) {
    const startTime = Date.now();
    console.log(`\n🔍 开始扫描目录: ${rootDir}`);
    console.log(`   阈值: ${Math.round(config.similarityThreshold * 100)}% | 哈希深度: ${config.hashDepth === Infinity ? '全部' : config.hashDepth} | 忽略: ${config.ignorePatterns.length} 个模式\n`);

    let dirs;
    try {
        dirs = await fs.readdir(rootDir);
    } catch (err) {
        console.error(`❌ 无法读取目录: ${rootDir}`);
        return;
    }

    const projects = [];
    for (const dir of dirs) {
        const projectPath = path.join(rootDir, dir);
        try {
            const stat = await fs.stat(projectPath);
            if (stat.isDirectory() && !dir.startsWith('.')) {
                process.stdout.write(`   📁 ${dir} ...`);
                const details = await getProjectDetails(projectPath, dir, config);
                const techStack = detectTechStack({ ...details, projectPath });
                projects.push({ ...details, ...techStack });
                console.log(` ✅ (${details.fileCount} 文件, ${formatSize(details.totalSizeBytes)})`);
            }
        } catch {}
    }

    const elapsed = Date.now() - startTime;
    console.log(`\n✅ 扫描完成，共分析 ${projects.length} 个项目，耗时 ${formatDuration(elapsed)}\n`);

    if (projects.length === 0) {
        console.warn('⚠️  未找到任何项目目录。');
        return;
    }

    console.log('🔗 检测重复项目...');
    const duplicates = await findDuplicates(projects, config.similarityThreshold);

    if (duplicates.length > 0) {
        console.log(`   发现 ${duplicates.length} 组重复/相似项目`);
    } else {
        console.log('   未发现重复项目');
    }

    const reportFiles = await writeReport(rootDir, projects, duplicates, config, elapsed);
    console.log(`\n📄 报告已生成:`);
    reportFiles.forEach(f => console.log(`   → ${f}`));

    if (config.autoOpenReport && reportFiles.length > 0) {
        const { exec } = require('child_process');
        const mdFile = reportFiles.find(f => f.endsWith('.md'));
        if (mdFile) {
            exec(`open "${mdFile}"`, (err) => {
                if (err) console.log('   (无法自动打开报告)');
            });
        }
    }

    return { projects, duplicates, elapsed, reportFiles };
}

async function menuRootPathManager(config) {
    while (true) {
        console.log('\n📁 ═══ 路径管理 ═══');
        const pathChoices = config.rootPaths.map((p, i) => ({
            name: `${i + 1}. ${p}${fsSync.existsSync(p) ? '' : ' ⚠️ (不存在)'}`,
            value: `path_${i}`
        }));
        pathChoices.push(new Separator());
        pathChoices.push({ name: '➕ 添加新路径', value: 'add' });
        pathChoices.push({ name: '🔍 浏览文件系统选择', value: 'browse' });
        pathChoices.push({ name: BACK_SYMBOL, value: BACK_VALUE });

        const { action } = await prompt([{
            type: 'select', name: 'action', message: '路径管理:', choices: pathChoices
        }]);

        if (action === BACK_VALUE) return config;

        if (action === 'add') {
            const { newPath } = await prompt([{
                type: 'input', name: 'newPath', message: '输入新路径:'
            }]);
            if (newPath && newPath.trim()) {
                const resolved = path.resolve(newPath.trim());
                if (fsSync.existsSync(resolved)) {
                    if (!config.rootPaths.includes(resolved)) {
                        config.rootPaths.push(resolved);
                        await saveConfig(config);
                        console.log(`✅ 已添加: ${resolved}`);
                    } else {
                        console.log('⚠️  路径已存在');
                    }
                } else {
                    console.log(`❌ 路径不存在: ${resolved}`);
                }
            }
        } else if (action === 'browse') {
            let current = '/';
            while (true) {
                let entries;
                try {
                    entries = (await fs.readdir(current, { withFileTypes: true }))
                        .filter(d => d.isDirectory() && !d.name.startsWith('.'))
                        .map(d => d.name)
                        .sort();
                } catch {
                    console.log('❌ 无法读取目录');
                    break;
                }

                const browseChoices = [
                    new Separator('📍 当前: ' + current),
                    { name: '✅ 选择当前目录', value: 'select_current' },
                    new Separator()
                ];
                entries.slice(0, 30).forEach(e => {
                    browseChoices.push({ name: `📂 ${e}`, value: `dir_${e}` });
                });
                if (entries.length > 30) {
                    browseChoices.push(new Separator('... 还有 ' + (entries.length - 30) + ' 个目录'));
                }
                browseChoices.push(new Separator());
                browseChoices.push({ name: '⬆️  上级目录', value: 'up' });
                browseChoices.push({ name: BACK_SYMBOL, value: BACK_VALUE });

                const { browseAction } = await prompt([{
                    type: 'select', name: 'browseAction', message: '浏览目录:', choices: browseChoices
                }]);

                if (browseAction === BACK_VALUE) break;
                if (browseAction === 'up') {
                    current = path.dirname(current);
                } else if (browseAction === 'select_current') {
                    if (!config.rootPaths.includes(current)) {
                        config.rootPaths.push(current);
                        await saveConfig(config);
                        console.log(`✅ 已添加: ${current}`);
                    } else {
                        console.log('⚠️  路径已存在');
                    }
                    break;
                } else if (browseAction.startsWith('dir_')) {
                    current = path.join(current, browseAction.replace('dir_', ''));
                }
            }
        } else if (action.startsWith('path_')) {
            const idx = parseInt(action.replace('path_', ''));
            const target = config.rootPaths[idx];
            console.log(`\n📍 ${target}`);
            const { pathAction } = await prompt([{
                type: 'select', name: 'pathAction', message: '操作:',
                choices: [
                    { name: '🗑️  删除此路径', value: 'delete' },
                    { name: '✏️  修改此路径', value: 'edit' },
                    { name: BACK_SYMBOL, value: BACK_VALUE }
                ]
            }]);

            if (pathAction === 'delete') {
                if (await confirmAction(`确认删除 "${target}"?`)) {
                    config.rootPaths.splice(idx, 1);
                    await saveConfig(config);
                    console.log('✅ 已删除');
                }
            } else if (pathAction === 'edit') {
                const { newPath } = await prompt([{
                    type: 'input', name: 'newPath', message: '新路径:', default: target
                }]);
                if (newPath && newPath.trim() && newPath.trim() !== target) {
                    config.rootPaths[idx] = path.resolve(newPath.trim());
                    await saveConfig(config);
                    console.log('✅ 已更新');
                }
            }
        }
    }
}

async function menuIgnorePatterns(config) {
    while (true) {
        console.log('\n🚫 ═══ 忽略目录模式管理 ═══');
        console.log('当前忽略模式:');
        config.ignorePatterns.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));

        const { action } = await prompt([{
            type: 'select', name: 'action', message: '操作:',
            choices: [
                { name: '📦 加载预设模式集', value: 'preset' },
                { name: '➕ 添加模式', value: 'add' },
                { name: '🗑️  删除模式', value: 'delete' },
                { name: '🔄 重置为默认', value: 'reset' },
                { name: BACK_SYMBOL, value: BACK_VALUE }
            ]
        }]);

        if (action === BACK_VALUE) return config;
        if (action === 'preset') {
            const { preset } = await prompt([{
                type: 'select', name: 'preset', message: '选择预设:',
                choices: [
                    { name: 'Node.js 项目', value: 'node' },
                    { name: 'Python 项目', value: 'python' },
                    { name: 'Java 项目', value: 'java' },
                    { name: '🌐 全部（合并所有预设）', value: 'all' },
                    { name: BACK_SYMBOL, value: BACK_VALUE }
                ]
            }]);
            if (preset !== BACK_VALUE && IGNORE_PRESETS[preset]) {
                const merged = [...new Set([...config.ignorePatterns, ...IGNORE_PRESETS[preset]])];
                config.ignorePatterns = merged;
                await saveConfig(config);
                console.log(`✅ 已加载预设，共 ${merged.length} 个模式`);
            }
        } else if (action === 'add') {
            const { pattern } = await prompt([{
                type: 'input', name: 'pattern', message: '输入忽略模式 (如 **/test/**):'
            }]);
            if (pattern && pattern.trim()) {
                config.ignorePatterns.push(pattern.trim());
                await saveConfig(config);
                console.log(`✅ 已添加: ${pattern.trim()}`);
            }
        } else if (action === 'delete') {
            const { toDelete } = await prompt([{
                type: 'checkbox', name: 'toDelete', message: '选择要删除的模式:',
                choices: config.ignorePatterns.map(p => ({ name: p, value: p }))
            }]);
            if (toDelete.length > 0) {
                config.ignorePatterns = config.ignorePatterns.filter(p => !toDelete.includes(p));
                await saveConfig(config);
                console.log(`✅ 已删除 ${toDelete.length} 个模式`);
            }
        } else if (action === 'reset') {
            if (await confirmAction('确认重置为默认忽略模式?')) {
                config.ignorePatterns = [...DEFAULT_CONFIG.ignorePatterns];
                await saveConfig(config);
                console.log('✅ 已重置');
            }
        }
    }
}

async function menuSettings(config) {
    while (true) {
        console.log('\n⚙️  ═══ 分析配置 ═══');
        console.log(`   检测阈值: ${Math.round(config.similarityThreshold * 100)}%`);
        console.log(`   哈希深度: ${config.hashDepth === Infinity ? '全部文件' : `前 ${config.hashDepth} 个文件`}`);
        console.log(`   报告格式: ${config.reportFormat}`);
        console.log(`   报告目录: ${config.reportDir || '当前目录'}`);
        console.log(`   并发数: ${config.maxConcurrency}`);
        console.log(`   自动打开报告: ${config.autoOpenReport ? '是' : '否'}`);

        const { action } = await prompt([{
            type: 'select', name: 'action', message: '配置项:',
            choices: [
                { name: '🎯 检测阈值', value: 'threshold' },
                { name: '🔐 哈希深度', value: 'hash' },
                { name: '📄 报告格式', value: 'format' },
                { name: '📂 报告输出目录', value: 'reportDir' },
                { name: '⚡ 最大并发数', value: 'concurrency' },
                { name: '🖥️  自动打开报告', value: 'autoOpen' },
                { name: '↩️  恢复全部默认', value: 'resetAll' },
                { name: BACK_SYMBOL, value: BACK_VALUE }
            ]
        }]);

        if (action === BACK_VALUE) return config;

        switch (action) {
            case 'threshold': {
                const { val } = await prompt([{
                    type: 'select', name: 'val', message: '选择检测阈值:',
                    choices: [...THRESHOLD_OPTIONS.map(o => ({ name: `${o.value === config.similarityThreshold ? '● ' : '  '}${o.name}`, value: o.value })), { name: BACK_SYMBOL, value: BACK_VALUE }]
                }]);
                if (val !== BACK_VALUE) {
                    config.similarityThreshold = val;
                    await saveConfig(config);
                    console.log(`✅ 检测阈值已设为 ${Math.round(val * 100)}%`);
                }
                break;
            }
            case 'hash': {
                const { val } = await prompt([{
                    type: 'select', name: 'val', message: '选择哈希深度:',
                    choices: [...HASH_DEPTH_OPTIONS.map(o => ({ name: `${o.value === config.hashDepth ? '● ' : '  '}${o.name}`, value: o.value })), { name: BACK_SYMBOL, value: BACK_VALUE }]
                }]);
                if (val !== BACK_VALUE) {
                    config.hashDepth = val;
                    await saveConfig(config);
                    console.log(`✅ 哈希深度已设为 ${val === Infinity ? '全部文件' : `前 ${val} 个文件`}`);
                }
                break;
            }
            case 'format': {
                const { val } = await prompt([{
                    type: 'select', name: 'val', message: '选择报告格式:',
                    choices: [...REPORT_FORMAT_OPTIONS.map(o => ({ name: `${o.value === config.reportFormat ? '● ' : '  '}${o.name}`, value: o.value })), { name: BACK_SYMBOL, value: BACK_VALUE }]
                }]);
                if (val !== BACK_VALUE) {
                    config.reportFormat = val;
                    await saveConfig(config);
                    console.log(`✅ 报告格式已设为 ${val}`);
                }
                break;
            }
            case 'reportDir': {
                const { val } = await prompt([{
                    type: 'input', name: 'val', message: '报告输出目录（留空为当前目录）:', default: config.reportDir
                }]);
                config.reportDir = val.trim();
                await saveConfig(config);
                console.log(`✅ 报告目录已设为 ${config.reportDir || '当前目录'}`);
                break;
            }
            case 'concurrency': {
                const { val } = await prompt([{
                    type: 'select', name: 'val', message: '选择并发数:',
                    choices: [
                        { name: '5（低性能设备）', value: 5 },
                        { name: '10', value: 10 },
                        { name: '20（推荐）', value: 20 },
                        { name: '50（高性能）', value: 50 },
                        { name: BACK_SYMBOL, value: BACK_VALUE }
                    ]
                }]);
                if (val !== BACK_VALUE) {
                    config.maxConcurrency = val;
                    await saveConfig(config);
                    console.log(`✅ 并发数已设为 ${val}`);
                }
                break;
            }
            case 'autoOpen': {
                config.autoOpenReport = !config.autoOpenReport;
                await saveConfig(config);
                console.log(`✅ 自动打开报告: ${config.autoOpenReport ? '已开启' : '已关闭'}`);
                break;
            }
            case 'resetAll': {
                if (await confirmAction('确认恢复所有配置为默认值?')) {
                    Object.assign(config, DEFAULT_CONFIG);
                    config.rootPaths = [...DEFAULT_CONFIG.rootPaths];
                    config.ignorePatterns = [...DEFAULT_CONFIG.ignorePatterns];
                    await saveConfig(config);
                    console.log('✅ 所有配置已恢复默认');
                }
                break;
            }
        }
    }
}

async function menuQuickAnalyze(config) {
    while (true) {
        const pathChoices = config.rootPaths.map(p => ({
            name: `${p}${fsSync.existsSync(p) ? '' : ' ⚠️'}`,
            value: p
        }));
        pathChoices.push(new Separator());
        pathChoices.push({ name: '✏️  手动输入路径', value: 'manual' });
        pathChoices.push({ name: BACK_SYMBOL, value: BACK_VALUE });

        const { rootPath } = await prompt([{
            type: 'select', name: 'rootPath', message: '选择分析目标:', choices: pathChoices
        }]);

        if (rootPath === BACK_VALUE) return;

        let targetDir;
        if (rootPath === 'manual') {
            const { manualPath } = await prompt([{
                type: 'input', name: 'manualPath', message: '输入目标路径:'
            }]);
            if (!manualPath || !manualPath.trim()) continue;
            targetDir = path.resolve(manualPath.trim());
        } else {
            targetDir = rootPath;
        }

        if (!fsSync.existsSync(targetDir)) {
            console.log(`❌ 路径不存在: ${targetDir}`);
            continue;
        }

        const { subPath } = await prompt([{
            type: 'input', name: 'subPath', message: '子目录（留空分析整个目录）:', default: ''
        }]);

        if (subPath && subPath.trim()) {
            targetDir = path.join(targetDir, subPath.trim());
            if (!fsSync.existsSync(targetDir)) {
                console.log(`❌ 子目录不存在: ${targetDir}`);
                continue;
            }
        }

        const result = await analyzeRootDirectory(targetDir, config);

        if (result) {
            const { nextAction } = await prompt([{
                type: 'select', name: 'nextAction', message: '下一步:',
                choices: [
                    { name: '🔄 重新分析', value: 'retry' },
                    { name: '🔙 返回主菜单', value: BACK_VALUE }
                ]
            }]);
            if (nextAction === BACK_VALUE) return;
        }
    }
}

async function menuHistory(config) {
    console.log('\n📜 ═══ 查看最近的报告 ═══');
    const reportDir = config.reportDir || process.cwd();
    try {
        const files = (await fs.readdir(reportDir))
            .filter(f => f.startsWith('analysis_') && (f.endsWith('.md') || f.endsWith('.json') || f.endsWith('.csv')))
            .sort()
            .reverse()
            .slice(0, 20);

        if (files.length === 0) {
            console.log('   暂无报告文件');
            return;
        }

        const { selected } = await prompt([{
            type: 'select', name: 'selected', message: '选择报告:',
            choices: [...files.map(f => ({ name: f, value: f })), { name: BACK_SYMBOL, value: BACK_VALUE }]
        }]);

        if (selected === BACK_VALUE) return;

        const filePath = path.join(reportDir, selected);
        const content = await fs.readFile(filePath, 'utf-8');
        console.log(`\n📄 ${filePath}:\n`);
        if (selected.endsWith('.json')) {
            const data = JSON.parse(content);
            console.log(`   项目数: ${data.summary?.totalProjects || 'N/A'}`);
            console.log(`   总大小: ${formatSize(data.summary?.totalSize || 0)}`);
            console.log(`   重复组: ${data.summary?.duplicateGroups || 0}`);
        } else {
            const lines = content.split('\n').slice(0, 50);
            lines.forEach(l => console.log(`   ${l}`));
            if (content.split('\n').length > 50) console.log('   ... (更多内容请直接打开文件查看)');
        }

        const { action } = await prompt([{
            type: 'select', name: 'action', message: '操作:',
            choices: [
                { name: '🗑️  删除此报告', value: 'delete' },
                { name: BACK_SYMBOL, value: BACK_VALUE }
            ]
        }]);

        if (action === 'delete' && await confirmAction(`确认删除 ${selected}?`)) {
            await fs.unlink(filePath);
            console.log('✅ 已删除');
        }
    } catch {
        console.log('   暂无报告文件');
    }
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║       YYC³ Interactive Project Analyzer          ║');
    console.log('║       言启象期 | 语枢未来                        ║');
    console.log('║       Words Initiate Quadrants                   ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    let config = await loadConfig();

    if (!fsSync.existsSync(CONFIG_FILE)) {
        console.log('💡 首次运行，已生成默认配置文件: .analyzer-config.json\n');
        await saveConfig(config);
    }

    while (true) {
        const { mainAction } = await prompt([{
            type: 'select',
            name: 'mainAction',
            message: '🚀 YYC³ 项目分析器 — 主菜单',
            choices: [
                { name: '🔍  开始分析', value: 'analyze' },
                { name: '📁  路径管理', value: 'paths' },
                { name: '⚙️  分析配置', value: 'settings' },
                { name: '🚫  忽略模式', value: 'ignores' },
                { name: '📜  历史报告', value: 'history' },
                new Separator(),
                { name: '❌  退出', value: 'exit' }
            ]
        }]);

        switch (mainAction) {
            case 'analyze':
                await menuQuickAnalyze(config);
                break;
            case 'paths':
                config = await menuRootPathManager(config);
                break;
            case 'settings':
                config = await menuSettings(config);
                break;
            case 'ignores':
                config = await menuIgnorePatterns(config);
                break;
            case 'history':
                await menuHistory(config);
                break;
            case 'exit':
                console.log('\n👋 感谢使用 YYC³ 项目分析器！\n');
                process.exit(0);
        }
    }
}

main().catch(err => {
    console.error('❌ 程序异常:', err.message);
    process.exit(1);
});
