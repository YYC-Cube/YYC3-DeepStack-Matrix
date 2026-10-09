#!/usr/bin/env node
/**
 * @file: gen-colors.mjs
 * @description: token 单源生成脚本 — 从 CSS 变量真源（theme.css）生成 TS 常量，消灭注释同步漂移（主文档 Phase 2 动作 2）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-10-10
 * @updated: 2026-10-10
 * @status: active
 * @tags: [theme],[codegen],[token-ssot]
 *
 * 用法: node scripts/gen-colors.mjs
 * 源:   apps/app-web-full/src/styles/theme.css（P1≡P3≡P4 字节同构，Phase 2 勘察实证 diff=0）
 * 产物: src/colors.generated.ts（勿手改）
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(pkgRoot, "..", "..");
const CSS_SOURCE = resolve(repoRoot, "apps/app-web-full/src/styles/theme.css");
const OUT_FILE = resolve(pkgRoot, "src/colors.generated.ts");

const css = readFileSync(CSS_SOURCE, "utf8");

// 仅取首个 :root 块（dark 块与运行时覆盖不在单源范围）
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/);
if (!rootBlock) {
  console.error("[gen-colors] 未找到 :root 块:", CSS_SOURCE);
  process.exit(1);
}

/** 解析 `--name: value;` → Record */
function parseVars(block) {
  const vars = {};
  for (const m of block.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

const vars = parseVars(rootBlock[1]);

// C 对象语义名 ← CSS 变量映射（Phase 2 勘察：gold/purple 在 theme.css 无源，fallback 手工项）
const C_MAP = {
  primary: "--primary",
  success: "--success",
  destructive: "--destructive",
  warning: "--warning",
  foreground: "--foreground",
  mutedFg: "--muted-foreground",
  background: "--background",
  border: "--border",
  card: "--card",
  ring: "--ring",
  secondary: "--secondary",
  accent: "--accent",
  muted: "--muted",
};

// theme.css 无源的既有语义色（原 colors.ts 手工项，显式登记为 fallback）
const C_FALLBACK = {
  gold: "#ffd700",
  purple: "#7b2ff7",
};

const lines = [];
lines.push("/**");
lines.push(" * @file: colors.generated.ts");
lines.push(" * @description: DO NOT EDIT — 由 scripts/gen-colors.mjs 从 apps/app-web-full/src/styles/theme.css 生成（token 单源机制）");
lines.push(" * @author: YanYuCloudCube Team");
lines.push(" * @generated: " + new Date().toISOString());
lines.push(" * @tags: [theme],[generated],[token-ssot]");
lines.push(" */");
lines.push("");
lines.push("// ── 语义色快捷对象 C（源: :root CSS 变量）──");
lines.push("export const C = {");
for (const [key, cssVar] of Object.entries(C_MAP)) {
  const v = vars[cssVar];
  if (v === undefined) {
    console.error(`[gen-colors] CSS 源缺失 ${cssVar}（映射表与 theme.css 漂移，请核对）`);
    process.exit(1);
  }
  lines.push(`  /** ${cssVar} */`);
  lines.push(`  ${key}: "${v}",`);
}
for (const [key, v] of Object.entries(C_FALLBACK)) {
  lines.push(`  /** (fallback: theme.css 无对应变量，手工登记) */`);
  lines.push(`  ${key}: "${v}",`);
}
lines.push("} as const;");
lines.push("");
lines.push("// ── 图表色（源: --chart-N）──");
lines.push("export const CHART_COLORS = {");
for (let i = 1; i <= 5; i++) {
  const v = vars[`--chart-${i}`];
  if (v === undefined) {
    console.error(`[gen-colors] CSS 源缺失 --chart-${i}`);
    process.exit(1);
  }
  lines.push(`  chart${i}: "${v}",`);
}
lines.push("} as const;");
lines.push("");
lines.push("// ── AI Family 角色色（源: --family-*）──");
lines.push("export const FAMILY_COLORS = {");
const familyKeys = ["navigator", "thinker", "prophet", "bolero", "sentinel", "master", "oracle", "creator"];
for (const k of familyKeys) {
  const v = vars[`--family-${k}`];
  if (v === undefined) {
    console.error(`[gen-colors] CSS 源缺失 --family-${k}`);
    process.exit(1);
  }
  lines.push(`  ${k}: "${v}",`);
}
lines.push("} as const;");
lines.push("");

writeFileSync(OUT_FILE, lines.join("\n"));
console.log(`[gen-colors] 已生成 ${OUT_FILE.replace(repoRoot + "/", "")}（C:${Object.keys(C_MAP).length + Object.keys(C_FALLBACK).length} chart:5 family:${familyKeys.length}）`);
