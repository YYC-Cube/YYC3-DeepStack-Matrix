#!/usr/bin/env bash
# YYC³ LeisureAPI · 生产主库引导(幂等):建角色 leisure(所有者)/leisure_app(运行)+ 建库 leisure + 默认权限
# 口令只从 ~/.yyc3-keybackup/leisure-prod.env 读取(gen-prod-secrets.sh 生成),经 psql 变量→会话设置→format(%L) 生成语句,
# 不出现在命令行历史与脚本文本中
# 用法:bash scripts/pg-prod-bootstrap.sh [--host 127.0.0.1] [--port 5433] [--superuser yanyu]
#   之后:DATABASE_URL="$DATABASE_URL_OWNER" pnpm exec prisma migrate deploy
#         psql ... -d leisure -f scripts/apply-pg-grants.sql
#         DATABASE_URL="$DATABASE_URL_OWNER" NODE_ENV=prod pnpm exec prisma db seed
set -euo pipefail

HOST="127.0.0.1"; PORT="5433"; SUPERUSER="${USER}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --superuser) SUPERUSER="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

ENVFILE="${YYC3_KEYBACKUP_DIR:-$HOME/.yyc3-keybackup}/leisure-prod.env"
[[ -f "$ENVFILE" ]] || { echo "missing $ENVFILE (run gen-prod-secrets.sh first)" >&2; exit 1; }
getv() { grep -E "^$1=" "$ENVFILE" | head -1 | cut -d= -f2-; }
OWNER_SECRET="$(getv LEISURE_DB_OWNER_PASSWORD)"
APP_SECRET="$(getv LEISURE_DB_APP_PASSWORD)"
[[ -n "$OWNER_SECRET" && -n "$APP_SECRET" ]] || { echo "secrets missing in $ENVFILE" >&2; exit 1; }

PSQL=(psql -h "$HOST" -p "$PORT" -U "$SUPERUSER" -v ON_ERROR_STOP=1 -v owner_secret="$OWNER_SECRET" -v app_secret="$APP_SECRET")

# 1) 角色(幂等)+ 凭据(经会话设置,语句由 format(%L) 动态生成)
"${PSQL[@]}" -d postgres <<'EOSQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'leisure') THEN CREATE ROLE leisure LOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'leisure_app') THEN CREATE ROLE leisure_app LOGIN; END IF;
END $$;
SELECT set_config('leisure.owner_secret', :'owner_secret', false);
SELECT set_config('leisure.app_secret', :'app_secret', false);
SELECT format('ALTER ROLE leisure WITH LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB ENCRYPTED PASSWORD %L', current_setting('leisure.owner_secret')) \gexec
SELECT format('ALTER ROLE leisure_app WITH LOGIN NOSUPERUSER NOCREATEROLE NOCREATEDB ENCRYPTED PASSWORD %L', current_setting('leisure.app_secret')) \gexec
SELECT 'CREATE DATABASE leisure OWNER leisure ENCODING ''UTF8'' TEMPLATE template0'
  WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'leisure') \gexec
EOSQL

# 2) 库内权限:连接/schema/默认 DML(迁移由 leisure 执行,新表自动授予运行账号)
"${PSQL[@]}" -d leisure <<'EOSQL'
GRANT CONNECT ON DATABASE leisure TO leisure_app;
GRANT USAGE ON SCHEMA public TO leisure_app;
ALTER SCHEMA public OWNER TO leisure;
ALTER DEFAULT PRIVILEGES FOR ROLE leisure IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO leisure_app;
ALTER DEFAULT PRIVILEGES FOR ROLE leisure IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO leisure_app;
EOSQL

echo "[pg-prod-bootstrap] ok: roles leisure/leisure_app + database leisure ready on $HOST:$PORT"
echo "next:"
echo "  set -a; source $ENVFILE; set +a"
echo "  DATABASE_URL=\"\$DATABASE_URL_OWNER\" pnpm --dir services/leisure-api exec prisma migrate deploy"
echo "  psql -h $HOST -p $PORT -U $SUPERUSER -d leisure -f services/leisure-api/scripts/apply-pg-grants.sql"
echo "  DATABASE_URL=\"\$DATABASE_URL_OWNER\" NODE_ENV=prod pnpm --dir services/leisure-api exec prisma db seed"
