#!/bin/bash
# YYC³ LeisureManage · NAS 45 掉线 watchdog(2026-11-17 NAS45 掉线 7h 盲区事故固化)
# 背景:NAS 自监控(prometheus/alertmanager)与 NAS 同宿主——整机掉线时无法告警自身;
#      本 watchdog 跑在 Mac(yyc3-22-1,生产 API 宿主,掉线场景存活节点)上,补监控盲区。
# 语义:每 5min(launchd)TCP 探 NAS 5433;翻转(掉线/恢复)→macOS 通知+日志
# 2026-11-26 增:在线常态顺带采 NAS PG 连接数(>240=80% 槽预警,进 HIGH 态通知一次,回落清;免密 ssh 已通)
# 手动:bash scripts/watchdog-nas45.sh once

HOST="${NAS45_HOST:-100.65.172.88}"
PORT="${NAS45_PORT:-5433}"
LOG="$HOME/Library/Logs/yyc3-nas45-watchdog.log"
STATE="$HOME/Library/Logs/yyc3-nas45-watchdog.state"
HIGH_STATE="$HOME/Library/Logs/yyc3-nas45-high.state"

mkdir -p "$(dirname "$LOG")" "$(dirname "$STATE")"

if ! nc -z -w 5 "$HOST" "$PORT" 2>/dev/null; then
  UP=0
else
  UP=1
fi

PREV=""
[ -f "$STATE" ] && PREV="$(cat "$STATE" 2>/dev/null)"

if [ "$UP" = "$PREV" ]; then
  # 在线常态:采 NAS PG 连接数(>240=80% 槽预警;HIGH 态通知一次,回落清;免密 ssh)
  CNT="$(ssh -o BatchMode=yes -o ConnectTimeout=8 YYC3@100.65.172.88 "sudo -n /usr/bin/psql -h 100.65.172.88 -p 5433 -U postgres -d leisure -t -A -c 'SELECT count(*) FROM pg_stat_activity;'" 2>/dev/null | tr -d '[:space:]')"
  case "$CNT" in
    ''|*[!0-9]*) CNT="-1" ;;
  esac
  if [ "$CNT" -ge 240 ]; then
    if [ "$(cat "$HIGH_STATE" 2>/dev/null)" != "1" ]; then
      echo "[$(date '+%F %T')] HIGH 连接数 $CNT/300" >> "$LOG"
      echo -n "1" > "$HIGH_STATE"
      osascript -e "display notification \"NAS PG 连接 $CNT/300(80% 预警)\" with title \"⚠ YYC³ LeisureManage\"" 2>/dev/null
    fi
  else
    if [ -f "$HIGH_STATE" ]; then rm -f "$HIGH_STATE"; fi
  fi
  exit 0
fi

TS="$(date '+%F %T')"
if [ "$UP" = "0" ]; then
  echo "[$TS] DOWN 生产主库 $HOST:$PORT 不可达" >> "$LOG"
  osascript -e "display notification \"生产主库不可达($HOST:$PORT)——写路径已断,检查 NAS 45\" with title \"🚨 YYC³ LeisureManage\" sound name \"Basso\"" 2>/dev/null
else
  echo "[$TS] UP 生产主库 $HOST:$PORT 恢复可达" >> "$LOG"
  osascript -e "display notification \"生产主库($HOST:$PORT)已恢复,可补发挂起部署\" with title \"✅ YYC³ LeisureManage\" sound name \"Glass\"" 2>/dev/null
fi

echo -n "$UP" > "$STATE"
echo "[$TS] state -> $UP" >> "$LOG"
