// 失效 vi.mock 检测：mock 路径相对测试文件 resolve 后目标不存在者（P5/M4-7 工具沉淀）
// 用法: node scripts/mock-audit.mjs <testDirs...>
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const roots = process.argv.slice(2);
if (!roots.length) { console.error("用法: node scripts/mock-audit.mjs <testDirs...>"); process.exit(2); }
const files = execSync(`find ${roots.join(" ")} -name '*.test.ts' -o -name '*.test.tsx'`, { encoding: "utf8" })
  .split("\n").filter(Boolean);

const stale = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const re = /vi\.mock\(\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const p = m[1];
    if (!p.startsWith(".")) continue; // 包路径由 exports 保证
    const base = resolve(dirname(f), p);
    const exists = [".ts", ".tsx", "/index.ts", "/index.tsx", ""].some(s => existsSync(base + s));
    if (!exists) stale.push(`${f} :: ${p}`);
  }
}
console.log(`STALE_COUNT=${stale.length}`);
stale.forEach(s => console.log(s));
process.exit(stale.length ? 1 : 0);
