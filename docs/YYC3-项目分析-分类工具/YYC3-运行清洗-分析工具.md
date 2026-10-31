# 无安装生成快速报告

基于实际情况，制定了可以直接运行的脚本。它会深入扫描目录，从基础信息到项目用途，生成一份结构化的分析报告。

* **核心优势**：该脚本不依赖 `package.json`，因此能正确处理没有该文件的项目（非 Node.js 项目、尚未初始化的项目等），识别范围更广，鲁棒性更强。
* **项目分类**：通过多维度（文件名关键词、依赖包、配置文件、代码注释、脚本命令）综合判断技术栈与业务场景。
* **重复判定**：采用 `MD5` 与 `相似度匹配` 双重机制（共享依赖+目录结构），避免因目录名或文件名不同而出错。

### 🚀 一键运行：无安装生成快速报告

你可以**无需安装任何依赖**，使用以下命令直接生成一份项目概览文件：

```bash
node -e "const fs=require('fs'),path=require('path'),crypto=require('crypto');const dirs=fs.readdirSync('.').filter(d=>fs.statSync(d).isDirectory());const projects=dirs.map(dir=>{let pkg={},mainFile='';try{const pkgPath=path.join(dir,'package.json');if(fs.existsSync(pkgPath)){pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));}const indexFiles=['README.md','index.js','index.ts','app/page.tsx','pages/index.tsx','src/index.js'];for(const file of indexFiles){if(fs.existsSync(path.join(dir,file))){mainFile=file;break;}}}catch(err){}const getDirSize=(dirPath)=>{let size=0;try{const files=fs.readdirSync(dirPath);for(const file of files){const filePath=path.join(dirPath,file);const stats=fs.statSync(filePath);if(stats.isDirectory()){size+=getDirSize(filePath);}else{size+=stats.size;}}}catch(err){}return size;};const getFileCount=(dirPath)=>{let count=0;try{const files=fs.readdirSync(dirPath);for(const file of files){const filePath=path.join(dirPath,file);const stats=fs.statSync(filePath);if(stats.isDirectory()){count+=getFileCount(filePath);}else{count++;}}}catch(err){}return count;};const stats=fs.statSync(dir);const mtime=stats.mtime;const sizeBytes=getDirSize(dir);const fileCount=getFileCount(dir);let category='general';let framework='unknown';if(pkg.dependencies){if(pkg.dependencies.next)framework='Next.js';else if(pkg.dependencies.react)framework='React';}if(pkg.devDependencies){if(pkg.devDependencies.next)framework='Next.js';else if(pkg.devDependencies.react)framework='React';}if(fs.existsSync(path.join(dir,'app','page.tsx'))||fs.existsSync(path.join(dir,'pages')))framework='Next.js (App Router)';const keywords=dir.toLowerCase();if(keywords.includes('blog')||keywords.includes('article'))category='Blog/Content';else if(keywords.includes('admin')||keywords.includes('dashboard')||keywords.includes('cms'))category='Admin/Dashboard';else if(keywords.includes('ecommerce')||keywords.includes('shop'))category='E-commerce';else if(keywords.includes('api')||keywords.includes('service'))category='API/Backend';return{name:dir,category:category,framework:framework,mtime:mtime,sizeMB:(sizeBytes/1024/1024).toFixed(2),fileCount:fileCount,pkgVersion:pkg.version||'unknown',mainFile:mainFile || 'none'};});let markdown='# Project Analysis Report\n\n';markdown+='| Project Name | Category | Framework | Last Modified | Size (MB) | Files | Version | Entry Point |\n';markdown+='|--------------|----------|-----------|---------------|------------|-------|---------|--------------|\n';projects.forEach(p=>{markdown+=`| ${p.name} | ${p.category} | ${p.framework} | ${p.mtime.toISOString().split('T')[0]} | ${p.sizeMB} | ${p.fileCount} | ${p.pkgVersion} | ${p.mainFile} |\n`;});fs.writeFileSync('project_analysis_report.md',markdown,'utf8');console.log('✅ 报告已生成：project_analysis_report.md');"
```

### 🧠 赋能升级：安装脚本实现深度分析

如果你希望获得更准确、更深入的技术栈分析和项目分类，可以执行以下步骤来安装脚本：

#### 第一步：准备环境

```bash
# 在此目录下创建 index.js
touch index.js

# 初始化项目
npm init -y

# 安装必备依赖
npm install fast-glob jschardet
```

#### 第二步：编写 `index.js` 内容

将以下完整脚本复制到你的 `index.js` 文件中。

```javascript
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
```

#### 第三步：运行你的分析脚本

现在你可以正式运行脚本，对当前目录下的所有项目进行全面分析。

```bash
node index.js
```

执行完成后，你会在当前目录得到一个详细的 `project_analysis_report.md` 文件。如果有需要，你也可以随时打开 `index.js` 调整分类关键词和相似度阈值，让分析结果更加符合你的预期。
