#!/bin/bash
# YYC³ LeisureManage · NAS 45 掉线 watchdog(2026-11-17 NAS45 掉线 7h 盲区事故固化)
# 背景:NAS 自监控(prometheus/alertmanager)与 NAS 同宿主——整机掉线时无法告警自身;
#      本 watchdog 跑在 Mac(yyc3-22-1,生产 API 宿主,掉线场景存活节点)上,补监控盲区。
# 语义:每 5min(由 launchd 控制)TCP 探 NAS 5433;状态翻转(掉线/恢复)时:
#   ①macOS 本机通知(osascript)②追加日志 ~/Library/Logs/yyc3-nas45-watchdog.log
# 安装:见 scripts/com.yyc3.nas45-watchdog.plist(launchd 每 300s 跑一次;Log 不 grows,翻转才写)
# 手动: bash scripts/watchdog-nas45.sh once

HOST="${NAS45_HOST:-100.65.172.88}"
PORT="${NAS45_PORT:-5433}"
LOG="$HOME/Library/Logs/yyc3-nas45-watchdog.log"
STATE="$HOME/Library/Logs/yyc3-nas45-watchdog.state"

mkdir -p "$(dirname "$LOG")" "$(dirname "$STATE")"

if ! nc -z -w 5 "$HOST" "$PORT" 2>/dev/null; then
  UP=0
else
  UP=1
fi

PREV=""
[ -f "$STATE" ] && PREV="$(cat "$STATE" 2>/dev/null)"

if [ "$UP" = "$PREV" ]; then
  # 状态未翻转:静默(不打扰)
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
