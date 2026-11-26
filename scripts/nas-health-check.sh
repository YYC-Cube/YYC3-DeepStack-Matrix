#!/bin/bash
# YYC³ NAS 45 · 综合自检脚本(2026-11-26;watchdog 配套;免密 ssh YYC3@NAS)
# 采集:PG 连接数/复制 lag/磁盘容量/GitBucket 可达/生产 API lm_db_up
# 用法:bash scripts/nas-health-check.sh        # 一次性输出;exit=FAIL 数
#      推荐 launchd/crontab 定时;异常行带 [FAIL] 便于 grep
NAS="${NAS45_HOST:-100.65.172.88}"
SSH_OPTS="-o BatchMode=yes -o ConnectTimeout=8"
FAILS=0

echo "── YYC³ NAS 45 健康自检 $(date '+%F %T') ──"

# 1) PG 连接数(>240=FAIL,>=200=WARN;max_connections=300)
CNT="$(ssh $SSH_OPTS YYC3@$NAS "sudo -n /usr/bin/psql -h 100.65.172.88 -p 5433 -U postgres -d leisure -t -A -c 'SELECT count(*) FROM pg_stat_activity;'" 2>/dev/null | tr -d '[:space:]')"
case "$CNT" in ''|*[!0-9]*) CNT=-1 ;; esac
if [ "$CNT" -ge 240 ]; then echo "[FAIL] PG 连接 $CNT/300"; FAILS=$((FAILS+1));
elif [ "$CNT" -ge 200 ]; then echo "[WARN] PG 连接 $CNT/300"; else echo "[ OK ] PG 连接 $CNT/300"; fi

# 2) 复制状态(主库视角:从库 walreceiver 在跟=OK;write_lag 秒数展示)
REPL="$(ssh $SSH_OPTS YYC3@$NAS "sudo -n /usr/bin/psql -h 100.65.172.88 -p 5433 -U postgres -d leisure -t -A -c \"SELECT client_addr, coalesce(round(extract(epoch from write_lag)),0) FROM pg_stat_replication LIMIT 1;\"" 2>/dev/null | head -1)"
REPL_ADDR="$(echo "$REPL" | cut -d'|' -f1 | xargs)"
REPL_LAG="$(echo "$REPL" | cut -d'|' -f2 | xargs)"
if [ -n "$REPL_ADDR" ]; then
  if [ -n "$REPL_LAG" ] && [ "$REPL_LAG" -le 60 ] 2>/dev/null; then echo "[ OK ] 从库 $REPL_ADDR 在跟(write_lag ${REPL_LAG}s)";
  elif [ -n "$REPL_LAG" ]; then echo "[FAIL] 从库 $REPL_ADDR write_lag ${REPL_LAG}s"; FAILS=$((FAILS+1));
  else echo "[ OK ] 从库 $REPL_ADDR 在跟"; fi
else
  echo "[WARN] 无从库跟随(promote 后或从库停时正常)"
fi

# 3) 磁盘(数据卷 /Volume3;>=85%=FAIL,>=75%=WARN)
DISK="$(ssh $SSH_OPTS YYC3@$NAS "df -h /Volume3 | tail -1 | awk '{print \$5}' | tr -d '%'" 2>/dev/null)"
case "$DISK" in ''|*[!0-9]*) DISK=-1 ;; esac
if [ "$DISK" -ge 85 ]; then echo "[FAIL] /Volume3 磁盘 ${DISK}%"; FAILS=$((FAILS+1));
elif [ "$DISK" -ge 75 ]; then echo "[WARN] /Volume3 磁盘 ${DISK}%"; else echo "[ OK ] /Volume3 磁盘 ${DISK}%"; fi

# 4) GitBucket 可达(200/401 均为活)
GB="$(curl -s -o /dev/null -w '%{http_code}' --max-time 6 "http://$NAS:8080/" 2>/dev/null)"
if [ "$GB" = "200" ] || [ "$GB" = "401" ]; then echo "[ OK ] GitBucket HTTP $GB"; else echo "[FAIL] GitBucket HTTP $GB"; FAILS=$((FAILS+1)); fi

# 5) 生产 API lm_db_up(Mac 本机 :3002)
DBUP="$(curl -s --max-time 6 http://127.0.0.1:3002/api/v1/metrics 2>/dev/null | grep '^lm_db_up ' | awk '{print $2}')"
if [ "$DBUP" = "1" ]; then echo "[ OK ] 生产 API lm_db_up=1"; else echo "[FAIL] lm_db_up=$DBUP(查库异常/槽满)"; FAILS=$((FAILS+1)); fi

echo "── 结果: $FAILS 项 FAIL ──"
exit "$FAILS"
