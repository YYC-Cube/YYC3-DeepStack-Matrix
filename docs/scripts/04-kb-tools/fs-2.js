// group-projects.js
const fs = require('fs');
const path = require('path');

// 假设你的报告在 project_analysis_report.md 中，但更直接的是从 projects 数组处理
// 这里提供一个基于 CLI 输出的 projects 数据的分组函数
function groupBySimilarity(projects, threshold = 0.85) {
    const groups = [];
    const used = new Set();

    for (let i = 0; i < projects.length; i++) {
        if (used.has(i)) continue;
        const group = [projects[i]];
        used.add(i);
        for (let j = i+1; j < projects.length; j++) {
            if (used.has(j)) continue;
            // 计算相似度（基于依赖共同包）
            const deps1 = Object.keys(projects[i].packageJson.dependencies || {});
            const deps2 = Object.keys(projects[j].packageJson.dependencies || {});
            const common = deps1.filter(d => deps2.includes(d)).length;
            const similarity = common / Math.max(deps1.length, deps2.length);
            if (similarity >= threshold) {
                group.push(projects[j]);
                used.add(j);
            }
        }
        groups.push(group);
    }
    return groups;
}

// 使用示例：假设你已经有了 projects 数组（可从之前的 index.js 导出）
// 这里只是示意，实际你可以在 index.js 最后调用这个函数并输出 JSON
console.log("按依赖相似度分组（阈值85%）：");
// groups.forEach((g,idx) => console.log(`Group ${idx+1}: ${g.map(p=>p.name).join(', ')}`));
