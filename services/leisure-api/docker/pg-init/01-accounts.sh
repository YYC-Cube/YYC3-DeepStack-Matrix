#!/bin/sh
# PostgreSQL 初始化(仅数据卷首次创建时执行):
# 创建应用运行角色 leisure_app(口令来自环境变量,不落字面量),并设置默认权限——
# 迁移由库所有者 leisure 执行;运行时账号只拿表级 DML,只增表的 UPDATE/DELETE 在迁移后由 scripts/apply-pg-grants.sql 收回
set -eu

: "${LEISURE_APP_PASSWORD:?LEISURE_APP_PASSWORD is required}"

# 1) 角色存在性(幂等)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'leisure_app') THEN
    CREATE ROLE leisure_app LOGIN;
  END IF;
END $$;
EOSQL

# 2) 口令(单引号转义后以字面量交给 psql;来源仅环境变量)
ESCAPED_PWD=$(printf '%s' "$LEISURE_APP_PASSWORD" | sed "s/'/''/g")
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "ALTER ROLE leisure_app WITH LOGIN PASSWORD '${ESCAPED_PWD}';"

# 3) 权限:库连接 + schema 使用 + 迁移后新表/序列默认 DML
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
GRANT CONNECT ON DATABASE leisure TO leisure_app;
GRANT USAGE ON SCHEMA public TO leisure_app;
ALTER DEFAULT PRIVILEGES FOR ROLE leisure IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO leisure_app;
ALTER DEFAULT PRIVILEGES FOR ROLE leisure IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO leisure_app;
EOSQL

echo "[pg-init] leisure_app role ready (DML via default privileges; run scripts/apply-pg-grants.sql after migrate deploy)"
