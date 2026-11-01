#!/usr/bin/env bash
# YYC³ LeisureManage · 开发环境一键起停(阶段6 交付)
# 用法:
#   bash scripts/dev-up.sh      # 起数据层 + API(development profile)
#   bash scripts/dev-up.sh down # 停全部
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
API="$ROOT/services/leisure-api"

if [ "${1:-up}" = "down" ]; then
  docker compose -f "$API/docker-compose.dev.yml" --profile full down
  echo "✔ 开发环境已停止"
  exit 0
fi

echo "▶ 1/3 编译 leisure-core(API 运行时依赖其 dist)"
(cd "$ROOT/packages/leisure-core" && ./node_modules/.bin/tsc -p tsconfig.build.json)

echo "▶ 2/3 编译 leisure-api"
(cd "$API" && ./node_modules/.bin/tsc -p tsconfig.build.json)

echo "▶ 3/3 起容器(MySQL/Redis + API,development profile)"
docker compose -f "$API/docker-compose.dev.yml" --profile full up -d

for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/api/v1/attendance/realtime 2>/dev/null || true)
  [ "$code" = "401" ] && break
  sleep 1
done
echo "✔ API 就绪:http://127.0.0.1:3001/api/v1(docs: http://127.0.0.1:3001/docs)"
echo "  Web 管理端:cd apps/app-leisure-web && ../app-web-full/node_modules/.bin/vite --port 3040"
echo "  艺人端 H5: cd apps/app-mp-artist && npm run build:h5 && cd dist && python3 -m http.server 10087"
echo "  首次部署需迁移与种子:见 services/leisure-api/README-DEV"
