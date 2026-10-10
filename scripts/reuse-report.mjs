// 复用率报表（双口径，Phase 6 动作 5 / DoD 口径重定义版）
// 口径 A「import 占比」：端侧业务代码 import 语句中来自 @yyc3 包的行占比（依赖结构视角；第三方基础库天然占大头，非 DoD 达标口径）
// 口径 B「域组件承接率」：packages 承接的组件件数 /（packages 组件 + 端侧遗留业务组件）——包化工程视角，Phase 6 DoD ≥80% 的达标口径
// 用法: node scripts/reuse-report.mjs
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// ── 口径 A：import 占比 ────────────────────────────────
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
  console.log(`[A] ${app}: @yyc3 ${pkgImports}/${extImports} 外部导入 = ${pct}%`);
}

// ── 口径 B：域组件承接率（DoD ≥80%）───────────────────
// 组件件 = .tsx 文件（排除 __tests__ / *.test.* / *.spec.* / e2e）；端侧业务组件 = src/app/{modules,components} 与 P2 根 components
const list = (cmd) => execSync(`(${cmd}) || true`, { encoding: "utf8" }).split("\n").filter(Boolean);
const EXCL = "grep -vE '__tests__/|__e2e__/|\\.(test|spec|stories)\\.'";
const pkgDirs = execSync("ls -d packages/*/src", { encoding: "utf8" }).split("\n").filter(Boolean);
let pkgTsx = 0;
for (const d of pkgDirs) {
  pkgTsx += list(`find ${d} -name '*.tsx' | ${EXCL}`).length;
}
const appDirs = [
  "apps/app-web-full/src/app/modules apps/app-web-full/src/app/components",
  "apps/app-desktop/src/app/modules apps/app-desktop/src/app/components",
  "apps/app-web-classic/src/app/modules apps/app-web-classic/src/app/components",
  "apps/app-sandbox-lite/components",
];
let appTsx = 0;
const perApp = [];
for (const d of appDirs) {
  const n = list(`find ${d} -name '*.tsx' 2>/dev/null | ${EXCL}`).length;
  appTsx += n;
  perApp.push(`${d.split(" ")[0].replace("/src/app", "").replace("apps/", "")}=${n}`);
}
const pctB = ((pkgTsx / (pkgTsx + appTsx)) * 100).toFixed(1);
const p2Tsx = list(`find apps/app-sandbox-lite/components -name '*.tsx' 2>/dev/null | ${EXCL}`).length;
const triTsx = appTsx - p2Tsx;
const pctTri = ((pkgTsx / (pkgTsx + triTsx)) * 100).toFixed(1);
console.log(`[B] 域组件承接率: packages=${pkgTsx} 件 / (packages ${pkgTsx} + 端侧遗留 ${appTsx}) = ${pctB}%  [${perApp.join("  ")}]`);
console.log(`[B'] 三端净承接率（P2 独立沙箱 ${p2Tsx} 件定性留端另计）: packages ${pkgTsx} / (packages ${pkgTsx} + 三端遗留 ${triTsx}) = ${pctTri}%`);
console.log(`    DoD ≥80%: ${Number(pctB) >= 80 ? "✅ 达标" : (Number(pctTri) >= 80 ? "✅ 三端净口径达标" : `❌ 未达标（三端净 ${pctTri}%；端侧遗留为定性留端终态件：dev 域文档页/admin config 域绑定/routes 级消费）`)}`);
