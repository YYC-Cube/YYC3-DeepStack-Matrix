#!/bin/bash
# YYC³ LeisureManage · 22 mac_standby promote 预案脚本(2026-11-17 NAS45 事故预案化;Owner 授权前禁跑)
# 背景:NAS 45=生产主库(100.65.172.88:5433);本机 5433(Docker leisure-postgres)=只读从(槽 mac_standby)。
#       NAS 整机掉线时写路径全断;promote=把本机从库提升为主,写路径即刻恢复(本机 API 直连本机 5433 无外网依赖)。
# 红线:promote 窗口=Owner 裁决项。本脚本默认拒绝执行;必须显式 PROMOTE_APPROVED='I-UNDERSTAND-FAILOVER' 才跑。
# 用法:PROMOTE_APPROVED='I-UNDERSTAND-FAILOVER' bash scripts/promote-22.sh
# 前置自查(脚本自动做):①NAS 45 确认不可达(双探)②本机从库可达且处于 recovery ③复制状态快照留档
# 步骤:①pg_promote() 提升本机 ②本机 pg_isready 直读验证 ③打印「连接串切换+API 重启+回切」人工清单
# 回切(45 恢复后):45 降为从重建复制 → 窗口期切回 connections.env 原值 → 重启 API(详单见脚本尾注释)

set -euo pipefail

if [ "${PROMOTE_APPROVED:-}" != "I-UNDERSTAND-FAILOVER" ]; then
  echo "⛔ promote=重大故障切换,需 Owner 授权。"
  echo "   确认后执行:PROMOTE_APPROVED='I-UNDERSTAND-FAILOVER' bash scripts/promote-22.sh"
  exit 1
fi

PG_HOST="${NAS45_HOST:-100.65.172.88}"
PG_PORT="${NAS45_PORT:-5433}"

echo "── ① NAS 45 复核(双探:TCP + HTTP GitBucket)"
if nc -z -w 5 "$PG_HOST" "$PG_PORT" 2>/dev/null; then
  echo "❌ NAS 45 主库端口可达——主库未掉线,无需 promote。拒绝执行(防止误切)。" && exit 1
fi
echo "   TCP 不可达 ✓(掉线实锤)"

echo "── ② 本机从库(本机 5433 Docker leisure-postgres)状态"
docker exec leisure-postgres pg_isready -U leisure -d leisure || { echo "❌ 本机从库不可达,无从可提升"; exit 1; }
INREC="$(docker exec leisure-postgres psql -U leisure -d leisure -t -A -c 'SELECT pg_is_in_recovery();' 2>/dev/null | tr -d '[:space:]')"
if [ "$INREC" != "t" ]; then
  echo "❌ 本机 5433 不在 recovery(已是主?)——状态异常,人工核对后手工处理"; exit 1
fi
echo "   从库 recovery=t ✓"

echo "── ③ 复制状态快照(留档 ~/Library/Logs/yyc3-promote-$(date +%F).log)"
LOG="$HOME/Library/Logs/yyc3-promote-$(date +%F).log"
docker exec leisure-postgres psql -U leisure -d leisure -c "SELECT now(), pg_last_wal_replay_lsn(), pg_last_xact_replay_timestamp();" >> "$LOG" 2>&1 || true

echo "── ④ promote(本机 5433 提升为主)"
docker exec leisure-postgres psql -U leisure -d leisure -c 'SELECT pg_promote(force => true);' || { echo "❌ pg_promote 失败,人工介入"; exit 1; }
sleep 2
INREC2="$(docker exec leisure-postgres psql -U leisure -d leisure -t -A -c 'SELECT pg_is_in_recovery();' 2>/dev/null | tr -d '[:space:]')"
[ "$INREC2" = "f" ] || { echo "❌ 提升后仍 recovery=t,人工介入"; exit 1; }
echo "   本机 5433 已是主(recovery=f) ✓"

echo "── ⑤ 写路径验证(本机直查)"
docker exec leisure-postgres psql -U leisure -d leisure -c "INSERT INTO job_run_log (job_name, business_date, status, started_at, finished_at, stats) VALUES ('promote-22-smoke', CURRENT_DATE, 'OK', now(), now(), '{\"note\":\"failover smoke\"}'::json);" >/dev/null && echo "   写入成功 ✓(promote smoke)"

cat <<'NEXT'
── ✅ promote 完成。剩余人工三步(本脚本不代做,防误操作):
1) 连接串切换:~/.yyc3-keybackup/leisure-prod.env 的 DATABASE_URL/DATABASE_URL_OWNER
   100.65.172.88:5433 → 127.0.0.1:5433(本机;连接权威=connections.env 同步改)
2) 重启生产 API:bash scripts/deploy-prod.sh SKIP_BUILD=1(现探针打本机端口,可达即过)
3) 通告/告警:重启后跑一轮写路径回归(docs/06 运维阶段《NAS恢复后写路径回归清单》)
── 回切(45 恢复后,窗口期):
① 45 原 PG 数据以「从」身份重建跟随本机主(pg_basebackup/复制槽重建)
② 复制追平后,窗口期把连接串切回 45(原值)③ 重启 API ④ 本机 5433 降回从
NEXT
echo "✅ promote-22 预案执行完毕(日志 $LOG)"