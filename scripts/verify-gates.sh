#!/bin/bash
# YYC³ Monorepo 全链路质量门禁（Phase 6 动作 1 本地态）
# 用法: bash scripts/verify-gates.sh [--skip-build]
set -uo pipefail
cd "$(dirname "$0")/.."
export NODE_OPTIONS=  # 清除 IDE debug 注入
FAIL=0
step() { echo ""; echo "═══ $1 ═══"; }
check() { if [ "$1" -ne 0 ]; then echo "❌ $2"; FAIL=1; else echo "✅ $2"; fi }

step "G1 十二包 tsc"
P=0
for pkg in theme core store ui business ai ops admin monitor ai-family ide shell; do
  (cd "packages/$pkg" 2>/dev/null && pnpm exec tsc --noEmit > /dev/null 2>&1) || { echo "❌ $pkg tsc"; P=1; }
done
check $P "十二包 tsc 全 0"

step "G2 四端 tsc"
P=0
for app in app-web-full app-desktop app-web-classic app-sandbox-lite; do
  (cd "apps/$app" && pnpm exec tsc --noEmit > /dev/null 2>&1) || { echo "❌ $app tsc"; P=1; }
done
check $P "四端 tsc 全 0"

if [ "${1:-}" != "--skip-build" ]; then
  step "G3 四端 build"
  P=0
  for app in app-web-full app-desktop app-web-classic app-sandbox-lite; do
    (cd "apps/$app" && pnpm build > /dev/null 2>&1) || { echo "❌ $app build"; P=1; }
  done
  check $P "四端 build 全绿"
fi

step "G4 失效 vi.mock 扫描"
node scripts/mock-audit.mjs apps/app-web-full/src/app/__tests__ apps/app-desktop/src/app/__tests__ apps/app-web-classic/src/app/__tests__ apps/app-sandbox-lite/__tests__ > /tmp/gate-mock.log 2>&1
check $? "vi.mock STALE=0（$(head -1 /tmp/gate-mock.log)）"

step "G5 i18n 裸键扫描"
node scripts/i18n-bare-key-scan.mjs apps/app-web-full/src/app packages/shell/src packages/monitor/src packages/ops/src packages/admin/src > /tmp/gate-i18n.log 2>&1
g5=$?
if [ $g5 -eq 0 ]; then echo "✅ i18n 裸键 0";
elif [ $g5 -eq 1 ]; then echo "⚠️ $(grep BARE_KEY_COUNT /tmp/gate-i18n.log | head -1)（存量登记待清，不阻断；清单见 /tmp/gate-i18n.log）";
else echo "❌ i18n 扫描器异常（exit=$g5）"; FAIL=1; fi

step "G6 复用率报表"
node scripts/reuse-report.mjs

echo ""
if [ $FAIL -eq 0 ]; then echo "🎉 全链路门禁通过"; else echo "💥 门禁存在失败项"; exit 1; fi
