#!/usr/bin/env bash
# YYC³ LeisureAPI · 核心链路演示(阶段2 交付物)
# 链路:登录→建艺人→审核→签到→上钟→串台→下钟→台费流水→手动扣费(直扣+审批)→冲正→余额对账
# 前置:docker compose MySQL/Redis 已起 + 服务已启动(node --env-file=.env --watch dist/main.js)
# 用法:bash scripts/demo-core-chain.sh
# 凭据:经环境变量或交互输入,不写入脚本(见 README-DEV 默认账号)
set -euo pipefail

BASE="http://127.0.0.1:3001/api/v1"
PHONE="${LEISURE_DEMO_PHONE:-13103790379}"
FINANCE_PHONE="${LEISURE_DEMO_FINANCE_PHONE:-13103790380}"

read -r -p "管理员密码(默认 dev 种子,见 README-DEV): " -s ADMIN_PASSWORD
echo

step() { printf '\n\033[1;36m▶ %s\033[0m\n' "$1"; }
jget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(json.dumps(d,ensure_ascii=False)[:400])"; }

step "1/12 管理端登录"
TOKEN=$(curl -s "$BASE/auth/admin/login" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
echo "token 已获取(len=$(printf %s "$TOKEN" | wc -c | tr -d ' '))"

step "2/12 财务登录(双人审批第二人)"
FTOKEN=$(curl -s "$BASE/auth/admin/login" -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$FINANCE_PHONE\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
echo "财务 token 已获取"

step "3/12 建艺人(默认等待审核)→ 审核通过"
BADGE="D$(date +%s)"
ARTIST=$(curl -s "$BASE/artists" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"realName\":\"演示档案-流水线\",\"stageName\":\"流水线\",\"badgeNo\":\"$BADGE\",\"phone\":\"138$(date +%s | tail -c 9)\",\"hourlyRate\":100,\"maxCrossRooms\":2}")
AID=$(printf '%s' "$ARTIST" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
echo "艺人 id=$AID 腰牌=$BADGE(默认 PENDING)"
curl -s "$BASE/artists/$AID/audit" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"auditStatus":"APPROVED"}' | jget

step "4/12 艺人端登录(wx dev 骨架)→ 扫码签到"
BINDTOKEN=$(curl -s "$BASE/auth/wx/login" -X POST -H 'Content-Type: application/json' \
  -d "{\"code\":\"demo-$BADGE\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['bindToken'])")
curl -s "$BASE/auth/wx/bind" -X POST -H 'Content-Type: application/json' \
  -d "{\"bindToken\":\"$BINDTOKEN\",\"badgeNo\":\"$BADGE\",\"storeId\":1}" | jget
ATOKEN=$(curl -s "$BASE/auth/wx/login" -X POST -H 'Content-Type: application/json' \
  -d "{\"code\":\"demo-$BADGE\"}" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['token'])")
curl -s "$BASE/attendance/checkin" -X POST -H "Authorization: Bearer $ATOKEN" -H 'Content-Type: application/json' \
  -d '{"reportType":"CHECKIN"}' | jget

step "5/12 上钟(必选房号→带出房型;快照单价与阈值)"
ROOMS=$(curl -s "$BASE/store/rooms?pageSize=50" -H "Authorization: Bearer $TOKEN")
ROOM_A=$(printf '%s' "$ROOMS" | python3 -c "import sys,json;rows=json.load(sys.stdin)['data']['rows'];print([r['id'] for r in rows if r['roomNo']=='A01'][0])")
ROOM_B=$(printf '%s' "$ROOMS" | python3 -c "import sys,json;rows=json.load(sys.stdin)['data']['rows'];print([r['id'] for r in rows if r['roomNo']=='B01'][0])")
SESSION=$(curl -s "$BASE/sessions/start" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"artistId\":$AID,\"roomId\":$ROOM_A}")
SID=$(printf '%s' "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['sessionId'])")
echo "场次 id=$SID 房A01 → 房态已置占用"
curl -s "$BASE/store/rooms?keyword=A01" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json;r=json.load(sys.stdin)['data']['rows'][0];print('A01 status =',r['status'])"

step "6/12 串台(并行独立核算)→ 实时看板=串台"
CROSS=$(curl -s "$BASE/sessions/$SID/cross" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"toRoomId\":$ROOM_B}")
SID2=$(printf '%s' "$CROSS" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['sessionId'])")
echo "串台场次 id=$SID2 房B01"
curl -s "$BASE/attendance/realtime" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json;a=[x for x in json.load(sys.stdin)['data']['artists'] if x['artistId']==$AID][0];print('实时状态 =',a['status'],'room =',a.get('roomName'))"

step "7/12 下钟×2(快照计费;房态回空闲;SESSION_DEDUCT 流水)"
curl -s "$BASE/sessions/$SID/finish" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}' | jget
curl -s "$BASE/sessions/$SID2/finish" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}' | jget
curl -s "$BASE/store/rooms?keyword=A01" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json;r=json.load(sys.stdin)['data']['rows'][0];print('A01 status =',r['status'])"

step "8/12 充值 ¥1000(现金;幂等键)"
curl -s "$BASE/stage-fee/recharge" -X POST -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: demo-$BADGE-r1" \
  -H 'Content-Type: application/json' -d "{\"artistId\":$AID,\"amount\":1000,\"payChannel\":\"CASH\"}" | jget

step "9/12 手动扣费 ¥100(直扣,备注必填)→ 余额 900"
curl -s "$BASE/stage-fee/manual-deduct" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"artistId\":$AID,\"amount\":100,\"remark\":\"演示违规扣费\"}" | jget

step "10/12 手动扣费 ¥600(≥阈值500→202审批单)→ 申请人自批被拒 → 财务批准落账"
curl -s -w '\nhttp=%{http_code}(41201→202)\n' "$BASE/stage-fee/manual-deduct" -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d "{\"artistId\":$AID,\"amount\":600,\"remark\":\"演示高额扣费\"}" | head -c 400
APPID=$(curl -s "$BASE/approvals?status=PENDING" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json;rows=json.load(sys.stdin)['data']['rows'];print([r['id'] for r in rows if float(r['amount'])==600][0])")
echo "审批单 id=$APPID;申请人自批:"
curl -s "$BASE/approvals/$APPID/decide" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"decision":"APPROVED"}' | jget
echo "财务批准:"
curl -s "$BASE/approvals/$APPID/decide" -X POST -H "Authorization: Bearer $FTOKEN" -H 'Content-Type: application/json' \
  -d '{"decision":"APPROVED"}' | jget

step "11/12 冲正直扣 ¥100(反向流水+关联原单)"
TXNID=$(curl -s "$BASE/stage-fee/txns?businessDateFrom=2020-01-01&businessDateTo=2030-01-01&keyword=$BADGE&pageSize=50" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json;rows=json.load(sys.stdin)['data']['rows'];print([r['id'] for r in rows if r['type']=='MANUAL_DEDUCT' and float(r['amount'])==-100.0][0])")
curl -s "$BASE/stage-fee/txns/$TXNID/reverse" -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"remark":"演示冲正"}' | jget

step "12/12 余额对账(余额 = Σ流水;明细 vs 汇总)"
BAL=$(curl -s "$BASE/stage-fee/balance/$AID" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['balance'])")
SUM=$(curl -s "$BASE/stage-fee/txns?businessDateFrom=2020-01-01&businessDateTo=2030-01-01&keyword=$BADGE&pageSize=200" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print('流水',d['total'],'笔 合计',d['totalAmount'])")
echo "余额=$BAL | $SUM"
python3 - "$BAL" <<'PYEOF'
import sys
bal = float(sys.argv[1])
expect = 1000.0 - 100.0 - 600.0 + 100.0
status = "OK" if abs(bal - expect) < 0.005 else "MISMATCH"
print("对账结果: 余额", bal, "期望", expect, "→", status)
PYEOF

printf '\n\033[1;32m✔ 核心链路演示完成(建艺人→签到→上钟→串台→下钟→流水→扣费→审批→冲正→对账)\033[0m\n'
