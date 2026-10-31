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
