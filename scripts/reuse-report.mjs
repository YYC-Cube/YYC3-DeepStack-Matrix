// 复用率报表：业务代码 import 中来自 @yyc3 packages 的占比（Phase 6 动作 5，目标 ≥80%）
// 用法: node scripts/reuse-report.mjs
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const apps = ["apps/app-web-full/src", "apps/app-desktop/src", "apps/app-web-classic/src"];
const pkgRe = /from ["']@yyc3\//;
const totalRe = /from ["'][^.][^"']*["']/; // 非相对导入（含 react 等）
for (const app of apps) {
  const files = execSync(`find ${app} -name '*.ts' -o -name '*.tsx' | grep -v node_modules`, { encoding: "utf8" }).split("\n").filter(Boolean);
  let pkgImports = 0, extImports = 0;
  for (const f of files) {
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (!totalRe.test(line)) continue;
      extImports++;
      if (pkgRe.test(line)) pkgImports++;
    }
  }
  const pct = extImports ? ((pkgImports / extImports) * 100).toFixed(1) : "0";
  console.log(`${app}: @yyc3 ${pkgImports}/${extImports} 外部导入 = ${pct}%`);
}
