#!/usr/bin/env node
/**
 * check-test-sync.mjs — 三端同源文件一致性校验（2026-10-16 测试回植经验固化）
 * =====================
 * 背景：classic/desktop 曾因 web-full 单测修复未回植而积累 80 项失败；
 *       本脚本将「同源同步」固化为 CI 门禁，防止再次漂移。
 *
 * 校验范围：
 *   1. 三端共享测试文件：classic/desktop 的 __tests__ 中与 web-full 同名者，
 *      内容必须一致（允许 SystemSettings 路径适配差异，规范化后比较）
 *   2. 三端 electron/ 共享文件：三端字节级一致（安全修复同步守护）
 *   3. 三端 deploy/ 共享文件：三端字节级一致
 *
 * 退出码：0 = 全部一致；1 = 存在漂移（CI 阻断）
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const APPS = ["app-web-full", "app-web-classic", "app-desktop"];

/** SystemSettings 路径适配规范化：两端组件目录结构不同，视为等价 */
function normalize(content, file) {
  if (basename(file).startsWith("SystemSettings") || basename(file).startsWith("core-components-integration")) {
    return content.replaceAll("../modules/admin/SystemSettings", "../components/SystemSettings");
  }
  return content;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function readIfExists(file) {
  const p = join(ROOT, file);
  if (!existsSync(p) || !statSync(p).isFile()) { return null; }
  return readFileSync(p, "utf8");
}

const drifts = [];
let checked = 0;

/**
 * 结构性差异豁免台账（2026-10-16 审定）：
 * 以下测试在 web-full 已随组件包化迁移（@yyc3/ide/* 或 modules/dev/*），
 * 而 classic/desktop 保留端侧 components/* 本地副本 —— 同名测试验证的是
 * 各自端的结构，属「端结构差异」而非同步遗漏，豁免强一致校验。
 * 新增豁免必须在此登记原因；组件完成三端统一包化后应从清单移除。
 */
const STRUCTURAL_DRIFT_ALLOWLIST = new Set([
  "CLITerminal.test.tsx",          // web-full: modules/dev；classic/desktop: components（端结构差异）
  "ColorPicker.test.tsx",          // web-full: @yyc3/ide/theme；classic/desktop: components/theme
  "ColorSwatch.test.tsx",          // 同上
  "color-utils.test.ts",           // 同上
  "theme-presets.test.ts",         // 同上
  "ComponentShowcase.test.tsx",    // web-full: modules/dev/design-system；classic/desktop: components/design-system
  "DesignSystemPage.test.tsx",     // 同上
  "DesignTokens.test.tsx",         // 同上
  "StageReview.test.tsx",          // 同上
  "DevGuidePage.test.tsx",         // web-full: modules/dev；classic/desktop: components
  "ThemeCustomizer.test.tsx",      // 同上
  "Sidebar.test.tsx",              // 历史端侧差异（各自端口前全绿）
  "useBigModelSDK.test.ts",        // 历史端侧差异（各自端口前全绿）
]);

// ── 1. 三端共享测试文件（web-full 为基准源）──
const fullTestDir = join(ROOT, "apps/app-web-full/src/app/__tests__");
const listFiles = (dir) =>
  existsSync(dir)
    ? readdirSync(dir).filter((f) => !f.startsWith(".") && statSync(join(dir, f)).isFile())
    : [];
const fullTests = listFiles(fullTestDir);

for (const t of fullTests) {
  if (STRUCTURAL_DRIFT_ALLOWLIST.has(t)) { continue; }
  const base = readIfExists(`apps/app-web-full/src/app/__tests__/${t}`);
  if (base === null) continue;
  const baseHash = sha256(normalize(base, t));
  for (const app of ["app-web-classic", "app-desktop"]) {
    const other = readIfExists(`apps/${app}/src/app/__tests__/${t}`);
    if (other === null) continue; // 该端无此文件 = 端特有测试，不比对
    checked++;
    if (sha256(normalize(other, t)) !== baseHash) {
      drifts.push(`[TEST-DRIFT] apps/${app}/src/app/__tests__/${t} 与 web-full 基准不一致（修复需三端同步回植）`);
    }
  }
}

// ── 2. 三端 electron/ 共享文件一致性 ──
const desktopElectronDir = join(ROOT, "apps/app-desktop/electron");
const electronFiles = listFiles(desktopElectronDir).filter((f) => f.endsWith(".ts"));

for (const f of electronFiles) {
  const base = readIfExists(`apps/app-desktop/electron/${f}`);
  for (const app of ["app-web-full", "app-web-classic"]) {
    const other = readIfExists(`apps/${app}/electron/${f}`);
    if (other === null) continue;
    checked++;
    if (sha256(other) !== sha256(base)) {
      drifts.push(`[ELECTRON-DRIFT] apps/${app}/electron/${f} 与 app-desktop 基准不一致（安全修复必须三端同步）`);
    }
  }
}

// ── 3. 三端 deploy/ 共享文件一致性 ──
for (const f of ["server.mjs", "nginx.conf"]) {
  const base = readIfExists(`apps/app-desktop/deploy/${f}`);
  if (base === null) continue;
  for (const app of ["app-web-full", "app-web-classic"]) {
    const other = readIfExists(`apps/${app}/deploy/${f}`);
    if (other === null) continue;
    checked++;
    if (sha256(other) !== sha256(base)) {
      drifts.push(`[DEPLOY-DRIFT] apps/${app}/deploy/${f} 与 app-desktop 基准不一致（部署安全策略必须三端同步）`);
    }
  }
}

// ── 结果输出 ──
console.log(`SYNC_CHECKED=${checked}`);
if (drifts.length > 0) {
  console.error(`SYNC_DRIFT=${drifts.length}`);
  for (const d of drifts) {
    console.error(`  ❌ ${d}`);
  }
  console.error("\n修复指引：以基准端为准同步回植（cp 后按需做 SystemSettings 路径适配），保持三端同源文件字节级一致。");
  process.exit(1);
} else {
  console.log("✅ 三端同源文件一致性校验通过（测试 / electron / deploy）");
  process.exit(0);
}
