#!/bin/bash
# YYC³ Monorepo 全链路质量门禁(Phase 6 动作 1 本地态)
# 用法: bash scripts/verify-gates.sh [--skip-build]
# G7 元门禁(2026-11-07 移交清单 #2 收口):apps/* packages/* 全覆盖断言,
# "新增应用/包未进门禁"这一错误类被结构性消灭
set -uo pipefail
cd "$(dirname "$0")/.."
export NODE_OPTIONS=  # 清除 IDE debug 注入
FAIL=0
step() { echo ""; echo "═══ $1 ═══"; }
check() { if [ "$1" -ne 0 ]; then echo "❌ $2"; FAIL=1; else echo "✅ $2"; fi }

# ── 门禁名单(单一声明处;G7 元门禁以目录实测比对) ──
PKGS=(theme core store ui business ai ops admin monitor ai-family ide shell leisure-core)
APPS=(app-web-full app-desktop app-web-classic app-sandbox-lite app-leisure-web app-mp-artist)
# 构建命令映射(默认 pnpm build;异构端在此登记)
BUILD_CMD() {
  case "$1" in
    app-mp-artist) echo "pnpm build:weapp" ;;
    *) echo "pnpm build" ;;
  esac
}

step "G1 十三包 tsc"
P=0
for pkg in "${PKGS[@]}"; do
  (cd "packages/$pkg" 2>/dev/null && pnpm exec tsc --noEmit > /dev/null 2>&1) || { echo "❌ $pkg tsc"; P=1; }
done
check $P "十三包 tsc 全 0"

step "G2 六端 tsc"
P=0
for app in "${APPS[@]}"; do
  (cd "apps/$app" && pnpm exec tsc --noEmit > /dev/null 2>&1) || { echo "❌ $app tsc"; P=1; }
done
check $P "六端 tsc 全 0"

if [ "${1:-}" != "--skip-build" ]; then
  step "G3 六端 build"
  P=0
  for app in "${APPS[@]}"; do
    (cd "apps/$app" && eval "$(BUILD_CMD "$app")" > /dev/null 2>&1) || { echo "❌ $app build"; P=1; }
  done
  check $P "六端 build 全绿"
fi

step "G4 失效 vi.mock 扫描(有测试目录的应用全覆盖)"
MOCK_DIRS=()
for app in "${APPS[@]}"; do
  for d in "apps/$app/src/app/__tests__" "apps/$app/src/__tests__" "apps/$app/__tests__"; do
    [ -d "$d" ] && MOCK_DIRS+=("$d")
  done
done
node scripts/mock-audit.mjs "${MOCK_DIRS[@]}" > /tmp/gate-mock.log 2>&1
check $? "vi.mock STALE=0（$(head -1 /tmp/gate-mock.log)，扫描 ${#MOCK_DIRS[@]} 目录）"

step "G5 i18n 裸键扫描"
node scripts/i18n-bare-key-scan.mjs apps/app-web-full/src/app apps/app-desktop/src/app apps/app-web-classic/src/app apps/app-leisure-web/src apps/app-mp-artist/src packages/shell/src packages/monitor/src packages/ops/src packages/admin/src packages/business/src packages/ai/src packages/ai-family/src packages/ide/src > /tmp/gate-i18n.log 2>&1
g5=$?
if [ $g5 -eq 0 ]; then echo "✅ i18n 裸键 0";
elif [ $g5 -eq 1 ]; then echo "⚠️ $(grep BARE_KEY_COUNT /tmp/gate-i18n.log | head -1)（存量登记待清，不阻断；清单见 /tmp/gate-i18n.log）";
else echo "❌ i18n 扫描器异常（exit=$g5）"; FAIL=1; fi

step "G6 复用率报表"
node scripts/reuse-report.mjs

step "G7 元门禁:目录全覆盖断言"
P=0
for d in packages/*/; do
  name=$(basename "$d")
  [[ " ${PKGS[*]} " == *" $name "* ]] || { echo "❌ 包 $name 未入 G1 门禁名单"; P=1; }
done
for d in apps/*/; do
  name=$(basename "$d")
  [ -f "$d/package.json" ] || continue
  [[ " ${APPS[*]} " == *" $name "* ]] || { echo "❌ 应用 $name 未入 G2/G3 门禁名单"; P=1; }
done
for app in "${APPS[@]}"; do
  [ -d "apps/$app" ] || { echo "❌ 门禁名单中的 $app 目录不存在"; P=1; }
done
check $P "G7 全覆盖断言(packages/* 与 apps/* 全部在名单内)"

echo ""
if [ $FAIL -eq 0 ]; then echo "🎉 全链路门禁通过"; else echo "💥 门禁存在失败项"; exit 1; fi
