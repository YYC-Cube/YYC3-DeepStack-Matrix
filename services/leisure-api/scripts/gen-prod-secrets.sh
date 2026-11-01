#!/usr/bin/env bash
# YYC³ LeisureAPI · 生产密钥/环境变量生成器
# 作用:用 openssl 生成强随机密钥与数据库口令,写入 ~/.yyc3-keybackup/leisure-prod.env(600);
#       仓库与示例文件永不包含真值;compose 以 --env-file 引用该文件(或拷到 NAS 项目目录同名 .env.production,600)
# 用法:bash scripts/gen-prod-secrets.sh [--db-host 192.168.3.22] [--db-port 5433] [--origins "https://a,https://b"] [--force]
# 幂等:目标文件已存在且未加 --force 时拒绝覆盖(防止轮换丢失)
set -euo pipefail

DB_HOST="192.168.3.22"
DB_PORT="5433"
ORIGINS="https://lm.0379.pro,https://lm.0379.world"
FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-host) DB_HOST="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --origins) ORIGINS="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

KEYDIR="${YYC3_KEYBACKUP_DIR:-$HOME/.yyc3-keybackup}"
OUT="$KEYDIR/leisure-prod.env"
mkdir -p "$KEYDIR" && chmod 700 "$KEYDIR"
if [[ -f "$OUT" && $FORCE -ne 1 ]]; then
  echo "refuse: $OUT exists (use --force to rotate; old file will be kept as .bak)" >&2
  exit 1
fi
[[ -f "$OUT" ]] && cp -p "$OUT" "$OUT.bak-$(date +%Y%m%d%H%M%S)"

# 口令字符集:字母数字 + 少量符号(避开 URL 保留字符 : / ? # @ & % 以免 DATABASE_URL 需转义)
rand_b64() { openssl rand -base64 "$1" | tr -d '\n'; }
rand_pwd() { openssl rand -base64 48 | tr -d '\n=+/' | cut -c1-"$1"; }

JWT_SECRET="$(rand_b64 48)"
JWT_REFRESH_SECRET="$(rand_b64 48)"
SCENE_HMAC_KEY="$(rand_b64 48)"
DB_OWNER_PWD="$(rand_pwd 32)"
DB_APP_PWD="$(rand_pwd 32)"

umask 077
cat > "$OUT" <<EOF
# YYC³ LeisureAPI 生产环境真值(生成于 $(date -u +%Y-%m-%dT%H:%M:%SZ);仅存本文件,勿入仓库/聊天)
NODE_ENV=prod
PORT=3001

# 数据库:主库 $DB_HOST:$DB_PORT;运行账号 leisure_app;所有者 leisure(仅迁移/维护用,不进 API)
DATABASE_URL=postgresql://leisure_app:${DB_APP_PWD}@${DB_HOST}:${DB_PORT}/leisure?schema=public
DATABASE_URL_OWNER=postgresql://leisure:${DB_OWNER_PWD}@${DB_HOST}:${DB_PORT}/leisure?schema=public
LEISURE_DB_OWNER_PASSWORD=${DB_OWNER_PWD}
LEISURE_DB_APP_PASSWORD=${DB_APP_PWD}

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_TTL=2h
JWT_REFRESH_TTL=7d
SCENE_HMAC_KEY=${SCENE_HMAC_KEY}

CORS_ORIGINS=${ORIGINS}
SWAGGER_ENABLED=false

BUSINESS_DAY_CUT=08:00
TRANSFER_MODE=manual
MANUAL_DEDUCT_THRESHOLD=500
ALLOW_NEGATIVE_BALANCE=true
ALLOW_STAGE_WITHOUT_CHECKIN=false
CHECKOUT_MIN_MINUTES=60
BILL_ROUNDING_MINUTES=15
SELF_ORDER_PER_TXN_LIMIT=500
SELF_ORDER_DAILY_LIMIT=2000
OPENAPI_ENABLED=false

# 语音盒子(店内私网地址;留空=仅大屏 Web Speech)
VOICE_BOX_URL=
VOICE_BOX_TIMEOUT_MS=3000

# 微信小程序(正式 AppID/Secret;拿到后填入)
WX_APPID=
WX_SECRET=
EOF
chmod 600 "$OUT"

mask() { local v="$1"; echo "${v:0:4}…${v: -4} (${#v} chars)"; }
echo "written: $OUT (600)"
echo "  JWT_SECRET         $(mask "$JWT_SECRET")"
echo "  JWT_REFRESH_SECRET $(mask "$JWT_REFRESH_SECRET")"
echo "  SCENE_HMAC_KEY     $(mask "$SCENE_HMAC_KEY")"
echo "  DB owner pwd       $(mask "$DB_OWNER_PWD")"
echo "  DB app pwd         $(mask "$DB_APP_PWD")"
echo "  CORS_ORIGINS       $ORIGINS"
echo "next: bash scripts/pg-prod-bootstrap.sh   # 用本文件口令在主库建库/建角色(幂等)"
