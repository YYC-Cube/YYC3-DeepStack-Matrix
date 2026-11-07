#!/bin/bash
# YYC³ LeisureAPI · 生产部署编排(迁移 → 优雅重启)
# 部署红线收口:代码(dist)与库 schema 两态必须一致,顺序依赖由本脚本消除——
# 先迁移(所有者账号)再重启,启动自防(main.ts assertDbSchemaUpToDate)兜底 fail-fast。
#
# 用法:
#   bash scripts/deploy-prod.sh            # 构建最新 dist → 迁移生产库 → 重启 :3002
#   SKIP_BUILD=1 bash scripts/deploy-prod.sh  # 跳过构建(仅迁移+重启)
#
# 前置:
#   - ~/.yyc3-keybackup/leisure-prod.env 含 DATABASE_URL(运行时受限账号)与
#     DATABASE_URL_OWNER(迁移用所有者账号;缺列迁移会 P3014/权限拒绝)
#   - 本脚本不提交任何凭据,凭证只从 keybackup env 读取
set -euo pipefail
cd "$(dirname "$0")/.."

PROD_ENV="${PROD_ENV:-$HOME/.yyc3-keybackup/leisure-prod.env}"
PORT="${PROD_PORT:-3002}"
[ -f "$PROD_ENV" ] || { echo "❌ 找不到 $PROD_ENV"; exit 1; }

# 1) 构建
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "── 构建 leisure-api dist…"
  (cd services/leisure-api && pnpm build)
fi

# 2) 迁移生产库(所有者账号;deploy 模式不需要影子库权限)
echo "── 迁移生产库(prisma migrate deploy)…"
MIGRATE_URL="$(sed -n 's/^DATABASE_URL_OWNER=//p' "$PROD_ENV" | tr -d '\r')"
[ -n "$MIGRATE_URL" ] || { echo "❌ $PROD_ENV 缺 DATABASE_URL_OWNER(迁移需所有者账号)"; exit 1; }
(cd services/leisure-api && DATABASE_URL="$MIGRATE_URL" pnpm exec prisma migrate deploy)

# 3) 优雅重启:按端口精确定位(严禁 pkill dist/main.js 一刀切——会误伤 dev/他方会话)
OLD_PID="$(lsof -t -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "$OLD_PID" ]; then
  echo "── 停旧实例 PID=$OLD_PID(:$PORT)"
  kill "$OLD_PID" 2>/dev/null || true
  for _ in 1 2 3 4 5; do kill -0 "$OLD_PID" 2>/dev/null || break; sleep 1; done
  kill -0 "$OLD_PID" 2>/dev/null && { echo "  强制终止"; kill -9 "$OLD_PID" 2>/dev/null || true; sleep 1; }
fi

# 4) 起新实例(nohup 脱离会话;日志按日追加)
LOG="services/leisure-api/prod-$(date +%Y%m%d).log"
echo "── 启动新实例 :$PORT(日志 $LOG)"
nohup node --env-file="$PROD_ENV" services/leisure-api/dist/main.js >> "$LOG" 2>&1 &

# 5) 就绪探针(生产关 Swagger,探公开路由的任意 HTTP 应答而非特定码)
for _ in $(seq 1 10); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -m 3 -X POST "http://127.0.0.1:$PORT/api/v1/auth/admin/login" -H 'Content-Type: application/json' -d '{}' 2>/dev/null || echo 000)"
  [ "$CODE" != "000" ] && break
  sleep 2
done
if [ "$CODE" != "000" ]; then
  echo "✅ 部署完成: :$PORT 已应答(HTTP $CODE)"
else
  echo "❌ 10 次探针无应答,检查 $LOG"; exit 1
fi
