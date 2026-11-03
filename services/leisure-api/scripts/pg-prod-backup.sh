#!/bin/bash
# YYC³ LeisureManage · PG15 生产主库每日备份(2026-11-03 投产稳定性批次)
# 策略:pg_dump custom 格式 → 本机滚动保留 14 天 → rsync 到 NAS(/Volume3/backup/leisure)
# 调度:launchd com.yyc3.leisure-pgbackup(每日 06:30,营业日切后/开档前低峰)
# 凭据:只读 ~/.yyc3-keybackup/leisure-prod.env 的 DATABASE_URL_OWNER(不落日志)
# 巡检:tail -50 ~/Library/Logs/leisure-pgbackup.log;文件 mtime 应为最近一次 06:30 后
set -euo pipefail

ENV_FILE="$HOME/.yyc3-keybackup/leisure-prod.env"
LOCAL_DIR="$HOME/YYC3-Cube/backups/leisure-prod"
LOG_FILE="$HOME/Library/Logs/leisure-pgbackup.log"
KEEP_DAYS=14
NAS_TARGET="YYC3@100.65.172.88:/Volume3/backup/leisure/"

log() { echo "[$(date '+%F %T')] $*" >> "$LOG_FILE"; }

if [[ ! -f "$ENV_FILE" ]]; then
  log "FATAL: 密钥文件不存在 $ENV_FILE"
  exit 1
fi
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
if [[ -z "${DATABASE_URL_OWNER:-}" ]]; then
  log "FATAL: DATABASE_URL_OWNER 未配置"
  exit 1
fi
# pg_dump 不认 Prisma 专有查询参数(?schema=public):剥掉 ? 后查询串
DB_URL="${DATABASE_URL_OWNER%%\?*}"
# 服务器为 PG15:必须用 postgresql@15 的客户端(pg_dump 版本须 ≥ 服务器版本)
PG15_BIN="/opt/homebrew/opt/postgresql@15/bin"
if [[ ! -x "$PG15_BIN/pg_dump" ]]; then
  log "FATAL: 未找到 PG15 客户端 $PG15_BIN/pg_dump"
  exit 1
fi

mkdir -p "$LOCAL_DIR"
STAMP="$(date '+%Y%m%d-%H%M')"
OUT="$LOCAL_DIR/leisure-$STAMP.dump"

log "backup start -> $OUT"
"$PG15_BIN/pg_dump" "$DB_URL" --format=custom --file="$OUT"
SIZE=$(du -h "$OUT" | cut -f1)
log "backup done size=$SIZE"

# 完整性自检:pg_restore --list 能读出目录即认为可用
if "$PG15_BIN/pg_restore" --list "$OUT" >/dev/null 2>&1; then
  log "verify ok (pg_restore --list readable)"
else
  log "FATAL: 备份文件不可读($OUT),请立即排查"
  exit 1
fi

# 本机滚动保留
find "$LOCAL_DIR" -name 'leisure-*.dump' -mtime +$KEEP_DAYS -delete
log "local retention applied (>$KEEP_DAYS d deleted)"

# NAS 异地副本(尽力而为;失败不置失败退出码,但留 ERROR 日志供巡检)
ssh -o BatchMode=yes -o ConnectTimeout=10 YYC3@100.65.172.88 "mkdir -p /Volume3/backup/leisure" 2>/dev/null || true
if rsync -az --timeout=120 "$OUT" "$NAS_TARGET" >> "$LOG_FILE" 2>&1; then
  log "nas sync ok -> $NAS_TARGET"
else
  log "ERROR: NAS 同步失败(NAS 离线/网络抖动),本地副本仍有效;下次任务将重试"
fi
log "=== run end ==="
