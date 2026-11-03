#!/bin/bash
# YYC³ LeisureManage · 生产一键巡检(投产稳定性批次 2026-11-03)
# 用法:bash prod-healthcheck.sh [--edge] [--nas]
#   默认:Mac 侧(API/DB/launchd/备份/防睡眠)+ 公网
#   --edge:加测 ECS 边缘(8802/8070/socat)
#   --nas:加测 NAS 备库 pg_isready
# 退出码:0 全绿;1 有 FAIL(可接告警)
set -u
PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
section() { echo ""; echo "== $1 =="; }

ENV_FILE="$HOME/.yyc3-keybackup/leisure-prod.env"
BACKUP_DIR="$HOME/YYC3-Cube/backups/leisure-prod"
LOG_FILE="$HOME/Library/Logs/leisure-pgbackup.log"

section "Mac · 生产 API(launchd :3002)"
launchctl list 2>/dev/null | grep -q leisure-api-prod && ok "launchd com.yyc3.leisure-api-prod loaded" || bad "api-prod 未加载"
H=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3002/api/v1/attendance/realtime)
[[ "$H" == "401" ]] && ok "API 本机健康(401 鉴权正常)" || bad "API 本机响应 $H(期望 401)"
T=$(curl -s -o /dev/null -w '%{time_total}' --max-time 5 http://127.0.0.1:3002/api/v1/attendance/realtime 2>/dev/null)
awk -v t="$T" 'BEGIN{exit !(t < 0.05)}' && ok "API 响应 ${T}s(<50ms 同机)" || bad "API 响应 ${T}s 异常(>50ms)"

section "Mac · PG15 主库(:5433)"
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
  DB_URL="${DATABASE_URL_OWNER%%\?*}"
  PG15="/opt/homebrew/opt/postgresql@15/bin"
  Q="$("$PG15/psql" "$DB_URL" -tAc 'select 1' 2>&1 | tail -1)"
  [[ "$Q" == "1" ]] && ok "DB 可连(owner)" || bad "DB 连接失败: $Q"
  ROWS="$("$PG15/psql" "$DB_URL" -tAc 'select count(*) from store' 2>&1 | tail -1)"
  [[ "$ROWS" =~ ^[0-9]+$ ]] && ok "业务表可查(store=$ROWS)" || bad "业务查询失败: $ROWS"
else
  bad "密钥文件缺失 $ENV_FILE"
fi

section "Mac · launchd 自愈链"
launchctl list 2>/dev/null | grep -q leisure-frp && ok "frp 隧道 loaded" || bad "leisure-frp 未加载"
launchctl list 2>/dev/null | grep -q leisure-pgbackup && ok "pgbackup 调度 loaded" || bad "leisure-pgbackup 未加载"
CAFFEINATE_PID=$(pgrep -f "caffeinate -s" | head -1)
[[ -n "$CAFFEINATE_PID" ]] && ok "防睡眠 caffeinate 运行(pid $CAFFEINATE_PID)" || bad "caffeinate 未运行(主库机可能睡眠=全站降级)"
SLEEP_VAL=$(pmset -g | awk '/^ *sleep /{print $2; exit}')
if [[ "$SLEEP_VAL" == "0" ]]; then
  ok "pmset sleep=0"
elif [[ -n "$CAFFEINATE_PID" ]]; then
  echo "  ⚠️  pmset sleep=$SLEEP_VAL(非 0,caffeinate -s 兜底中;彻底禁用:sudo pmset -c sleep 0)"
else
  bad "pmset sleep=$SLEEP_VAL 且 caffeinate 未运行(主库机会睡眠=全站降级)"
fi

section "Mac · 备份"
LATEST=$(ls -t "$BACKUP_DIR"/leisure-*.dump 2>/dev/null | head -1)
if [[ -n "$LATEST" ]]; then
  AGE_H=$(( ( $(date +%s) - $(stat -f %m "$LATEST") ) / 3600 ))
  if [[ $AGE_H -le 26 ]]; then ok "最新备份 ${AGE_H}h 前($(basename "$LATEST"))"; else bad "最新备份 ${AGE_H}h 前(>26h,任务可能未跑)"; fi
  "$PG15/pg_restore" --list "$LATEST" >/dev/null 2>&1 && ok "备份文件可读(pg_restore)" || bad "备份文件损坏"
else
  bad "无备份文件($BACKUP_DIR)"
fi
# 只看最后一次备份 run 的日志段(历史失败不追溯)
LAST_RUN=$(tac "$LOG_FILE" 2>/dev/null | awk '/=== run end ===/{print NR; exit}')
if [[ -n "${LAST_RUN:-}" ]]; then
  SEG=$(tac "$LOG_FILE" | head -n "$LAST_RUN" | tac)
  echo "$SEG" | grep -q "ERROR: NAS 同步失败" && bad "最近一次备份 NAS 同步失败(检查 NAS/Tailscale)" || ok "最近一次备份 NAS 同步成功"
else
  bad "备份日志无 run 记录(任务可能从未跑)"
fi

if [[ "${1:-}" == "--nas" || "${2:-}" == "--nas" ]]; then
  section "NAS · 备库(TCP 探活)"
  if nc -z -w 5 100.65.172.88 5433 2>/dev/null; then
    ok "备库端口 5433 可达(Tailscale;promote 演练见 007 号)"
  else
    bad "备库 100.65.172.88:5433 不可达(NAS 离线/流复制中断?)"
  fi
fi

if [[ "${1:-}" == "--edge" || "${2:-}" == "--edge" ]]; then
  section "ECS · 边缘"
  ssh -o BatchMode=yes -o ConnectTimeout=8 yyc3-33 '
    a=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8802/api/v1/attendance/realtime)
    b=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -H "Host: lm.0379.world" http://127.0.0.1:8070/api/v1/attendance/realtime)
    h=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8070/healthz)
    s=$(systemctl is-active yyc3-leisure-8802-relay 2>/dev/null)
    echo "8802=$a 8070=$b healthz=$h socat=$s"
  ' 2>/dev/null | while read -r line; do
    echo "  ℹ️  $line"
    case "$line" in
      *8802=401*8070=401*healthz=200*socat=active*) ;;
      *) echo "  ❌ 边缘链路有异常项(见上)"; FAIL=$((FAIL+1));;
    esac
  done
fi

section "公网"
W=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://lm.0379.world/)
M=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://lm.0379.world/api/v1/me/orders)
H5=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://lm.0379.pro/m/)
[[ "$W" == "200" ]] && ok "Web $W" || bad "Web $W"
[[ "$M" == "401" ]] && ok "API 路由 401(公网→Mac 主链)" || bad "API $M(期望 401;404=边缘回落旧链路!)"
[[ "$H5" == "200" ]] && ok "H5 $H5" || bad "H5 $H5"

echo ""
echo "== 结果: PASS=$PASS FAIL=$FAIL =="
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
