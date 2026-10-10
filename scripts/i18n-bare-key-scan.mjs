// i18n 裸键扫描门禁：组件源码 t("a.b.c") 调用键在 zh-CN 语言包缺失者（Phase 6 动作 3）
// 用法: node scripts/i18n-bare-key-scan.mjs <srcDirs...> --locale <zh-CN.ts 路径>
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const li = args.indexOf("--locale");
const localePath = li >= 0 ? args[li + 1] : "packages/core/src/i18n/zh-CN.ts";
const roots = (li >= 0 ? args.slice(0, li) : args);
if (!roots.length) { console.error("用法: node scripts/i18n-bare-key-scan.mjs <srcDirs...> [--locale zh-CN.ts]"); process.exit(2); }

// 解析 zh-CN 语言包为扁平键集（剥离 TS 语法：as const/satisfies/注解）
const localeSrc = readFileSync(localePath, "utf8");
function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}
// 字符级 lexer 提取对象字面量：忽略字符串/模板/注释内部的括号，仅统计代码层花括号
// （免疫 "{n} 分钟前" 类占位符、跨行字符串、尾部 type 块对配平的干扰）
const head = localeSrc.match(/^const \w+[^=]*=\s*\{/m);
if (!head) { console.error("语言包解析失败：未找到 const xx = {"); process.exit(2); }
const objStart = localeSrc.indexOf("{", head.index + head[0].length - 1);
let depth = 0, inStr = null, escape = false, inLine = false, inBlock = false;
let i = objStart, end = -1;
for (; i < localeSrc.length; i++) {
  const c = localeSrc[i], n = localeSrc[i + 1];
  if (inLine) { if (c === "\n") inLine = false; continue; }
  if (inBlock) { if (c === "*" && n === "/") { inBlock = false; i++; } continue; }
  if (inStr) {
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === inStr) inStr = null;
    continue;
  }
  if (c === "/" && n === "/") { inLine = true; i++; continue; }
  if (c === "/" && n === "*") { inBlock = true; i++; continue; }
  if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
  if (c === "{") depth++;
  else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
}
if (end < 0) { console.error("语言包解析失败：对象字面量未闭合"); process.exit(2); }
const localeObj = eval(`(${localeSrc.slice(objStart, end + 1)})`);
const keys = flatten(localeObj);
console.log(`locale keys: ${keys.size}`);

// 扫描源码 t("a.b") / t('a.b') 调用（豁免测试文件：__tests__/ 与 *.test.* / *.spec.*——nonexistent.* 类键为 fallback 行为测试意图）
const files = execSync(`find ${roots.join(" ")} -name '*.tsx' -o -name '*.ts' | grep -v node_modules | grep -vE '__tests__/|\\.(test|spec)\\.'`, { encoding: "utf8" })
  .split("\n").filter(Boolean);
const missing = [];
const re = /\bt\(\s*["']([a-zA-Z][\w.]*)["']/g;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  let m;
  while ((m = re.exec(src)) !== null) {
    const k = m[1];
    if (k.includes(".") && !keys.has(k)) missing.push(`${f} :: ${k}`);
  }
}
console.log(`BARE_KEY_COUNT=${missing.length}`);
missing.slice(0, 30).forEach(s => console.log(s));
if (missing.length > 30) console.log(`... 共 ${missing.length} 处`);
process.exit(missing.length ? 1 : 0);
