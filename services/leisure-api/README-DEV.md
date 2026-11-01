# YYC³ LeisureAPI · 开发速查(README-DEV)

> **MVP 六阶段全部完成**(阶段1 骨架/1-B 补缺/2 场次资金/3-4 Web 管理端+PWA/5 艺人小程序/6 报表+联调)。
> 模块:auth · artist(审核状态)· attendance(含现场屏 scene HMAC)· store(房型+房号)· store-config(艺人设置8项)· session(上下钟·串台·转包厢)· stage-fee(规则·充值·扣费·冲正·余额·艺人自查)· approval(双人审批)· taxonomy(等级组别)· **report(7 张 MVP)** · 日切 job。台票/订单评价/预约/展示/支付渠道为 II 期。

## 一键起停(阶段6)

```bash
bash services/leisure-api/scripts/dev-up.sh        # 编译 core+api → compose 起 MySQL/Redis/API(容器化)
bash services/leisure-api/scripts/dev-up.sh down   # 全停
```
- 容器 API 为 bind-mount 模式(node:22-alpine + openssl;Prisma 多引擎 binaryTargets 已配 arm64 musl 双版本)
- 迁移/种子仍按下方宿主流程执行(需 leisure 账号 DDL 权限)

## 报表(阶段6,10-后端 §七 7 张 MVP;§8.3 包厢维度)

| 端点(GET /reports/…) | 权限 | 包厢维度 |
|---|---|---|
| stage-fee/deduct-detail | fee:ledger:view | ✅ 房号/房型(关联场次) |
| stage-fee/recharge | fee:ledger:view | — |
| stage-fee/summary | fee:ledger:view | ✅ 涉及包厢聚合列 |
| attendance/detail | attend:ledger:view | — |
| attendance/summary | attend:summary:view | — |
| session/detail | session:view | ✅ 房号/房型/计费小时/单价 |
| session/summary | session:view | ✅ 涉及包厢聚合列 |

- 全部支持 `&format=csv`(UTF-8 BOM,Excel 直开;xlsx 真格式 II 期);导出另需 `report:export`(导出权限与查看分离)
- 区间上限 92 天;默认当日(营业日口径)

## 快速启动

```bash
cd services/leisure-api

# 1) 依赖(monorepo 根执行一次;构建脚本放行表见根 pnpm-workspace.yaml allowBuilds)
pnpm install

# 2) 本地域名包产物(dev 走 node dist,运行时加载 @yyc3/leisure-core 的 dist)
pnpm --filter @yyc3/leisure-core build

# 3) 本地 MySQL/Redis(宿主机端口 3307/6380,避开本机既有 3306/6379 服务)
docker compose -f docker-compose.dev.yml up -d

# 4) 环境与数据库
cp .env.example .env          # .env 默认用受限运行时账号 leisure_app(流水/审计表只增)
pnpm prisma:generate
# 迁移需 DDL,临时切换 migrate 账号(leisure):
DATABASE_URL=mysql://leisure:leisure-dev-only@127.0.0.1:3307/leisure \
  pnpm prisma:migrate --name xxx
# 应用账号授权:全新数据卷由 docker/mysql-init/02-accounts.sql 自动;既有卷执行:
#   docker exec -i leisure-mysql mysql -uroot -p < scripts/apply-prod-grants.sql
pnpm db:seed

# 5) 起服务
pnpm dev                       # http://localhost:3001/api/v1(docs: /docs)
```

> **dev 脚本说明**:`tsc 首编译 → 后台 node --watch dist/main.js + 前台 tsc -w 增量重编`。
> 不用 tsx 跑服务:tsx(esbuild 系)在本配置下不产出 `design:paramtypes` 装饰器元数据,
> Swagger 扫描方法参数会直接崩。seed 等无装饰器脚本仍走 tsx。

## 默认账号(开发)

| 账号 | 密码 | 角色 |
|---|---|---|
| 13103790379 | ChangeMe@2026 | 管理员(全功能码)——**首登必改** |
| 13103790380 | ChangeMe@2026 | 财务(手动扣费审批第二人,C-08 双人防线)——**首登必改** |

## 接口速览(阶段1 已实现)

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/v1/auth/admin/login | 管理端登录 → accessToken/refreshToken/permCodes |
| POST | /api/v1/auth/wx/login | 艺人端 code 登录(未配 WX_APPID 时 code 即 openid,仅 dev) |
| POST | /api/v1/auth/wx/bind | bindToken+腰牌号/手机号绑定;跨店→转移工单 |
| GET | /api/v1/artists | 列表(组别/等级/关键词/分页) |
| POST | /api/v1/artists | 新建(腰牌号唯一 40901) |
| DELETE | /api/v1/artists/:id | 软删(有流水 40906) |
| PUT | /api/v1/artists/batch | 批量设置(等级/组别/状态) |
| POST | /api/v1/attendance/checkin | 艺人扫码签到(geo 可空) |
| POST | /api/v1/attendance/checkout | 签退(<60 分钟 40905) |
| GET | /api/v1/attendance/reports | 明细 |
| GET | /api/v1/attendance/summary | 汇总矩阵(10 列) |
| POST | /api/v1/attendance/manual | 补打卡(原因必填) |
| GET | /api/v1/attendance/realtime | 实时看板(阶段1 仅考勤态) |
| GET/POST/PUT/DELETE | /api/v1/store/room-types[/:id] | 包厢类型 CRUD(有房号禁删;`room:manage`) |
| GET/POST/PUT/DELETE | /api/v1/store/rooms[/:id] | 包厢房号 CRUD(房号店内唯一 40907;有场次禁删;`room:manage`) |
| PUT | /api/v1/store/rooms/:id/status | 房态流转 FREE/MAINTENANCE/DISABLED(OCCUPIED 由上下钟驱动,手工置 400) |
| POST | /api/v1/artists/:id/audit | 档案审核流转 APPROVED/REJECTED(§3;默认建档 PENDING;`artist:edit`) |
| GET | /api/v1/artists?auditStatus= | 档案列表按审核态筛选(PENDING/REJECTED/APPROVED) |
| GET/PUT | /api/v1/store-config/artist-settings | 艺人设置 8 项读写(门店级 > env 默认;`setting:manage`) |
| POST | /api/v1/sessions/start | 上钟:{artistId, roomId 必选};前置校验(40904/400)+ 单价/阈值/模式快照;房态→OCCUPIED(`session:view`) |
| POST | /api/v1/sessions/:id/finish | 下钟:按快照计费(HOURLY 先保底再进位 / FLAT 一口价);落 SESSION_DEDUCT;末场离房→FREE(`session:finish`) |
| POST | /api/v1/sessions/:id/cross | 串台:并行新开一场独立核算(§6.6;maxCrossRooms 拦 40904) |
| POST | /api/v1/sessions/:id/transfer | 转包厢:终止当前(同规结算)+ 同事务新开(§6.6) |
| GET | /api/v1/sessions | 检索:营业日区间/组别/房号/状态(全部 onstage cross)/关键词(A20) |
| GET/POST/PUT/DELETE | /api/v1/stage-fee-rules[/:id] | 台费规则 CRUD;该房型当日已有上钟禁改 40903(`feerule:manage`) |
| GET | /api/v1/stage-fee/resolve-rule?levelId=&roomTypeId= | 单价预览(等级×房型解析) |
| POST | /api/v1/stage-fee/recharge | 充值:MVP 仅 CASH(幂等键);返回 {txnId, balance}(`fee:recharge`) |
| POST | /api/v1/stage-fee/manual-deduct | 手动扣费:备注必填;≥500 → 202+41201 审批单;否则直扣(`fee:manual`) |
| GET | /api/v1/stage-fee/txns | 流水三查:营业日区间/类型/组别/腰牌艺名;含 totalAmount(`fee:ledger:view`) |
| GET | /api/v1/stage-fee/balance/:artistId | 余额 = Σ流水(挂起审批不计入) |
| POST | /api/v1/stage-fee/txns/:id/reverse | 冲正:REVERSE 反向流水+关联原单;冲正单不可再冲(`fee:manual`) |
| GET | /api/v1/approvals?status= | 审批列表(`fee:ledger:view`) |
| POST | /api/v1/approvals/:id/decide | 审批决定:审批人≠申请人;通过才落 MANUAL_DEDUCT(`approval:decide`) |

### 核心链路演示(阶段2 交付)

```bash
bash scripts/demo-core-chain.sh
# 建艺人→审核→签到→上钟→串台→下钟→充值→手动扣费(直扣+审批)→冲正→余额对账,12 步全链路
```

### 资金红线落点(铁律 2)

- DB 层:`stage_fee_txn / ticket_txn / audit_log / wechat_bind_log` 对运行时账号 `leisure_app` **只授 SELECT+INSERT**(02-accounts.sql / apply-prod-grants.sql);验证:`docker exec leisure-mysql mysql -uleisure_app -p … -e "UPDATE stage_fee_txn SET amount=0 WHERE id=1"` → ERROR 1142
- 应用层:流水只 create 不 update/delete;更正走 REVERSE;金额精度 2 位;资金写接口幂等键 24h 回放(快照落库后才返回响应)
- 日切 job:进程内 60s 轮询物化上一营业日 daily_summary(幂等可重跑,BullMQ 就绪后平移);痕迹在 job_run_log

统一响应:`{ code: 0, msg: "ok", data: … }`(全局 TransformInterceptor 包裹,幂等回放体同样单层信封);错误码对齐 04 文档。公开路由(免 token)仅 `auth/admin/login`、`auth/wx/login`,以 `@Public()` 标注,其余全部过 JwtGuard。

## 已知边界(阶段2+ 解决)

- session/stage-fee/approval/ticket/report 模块未实现(见 10 号文档 §二)
- 实时看板"上钟/串台/被选中"待 session 模块接通(房号→房型→单价联动的占用流转同批落地)
- Idempotency 拦截器的并发首写竞争由唯一索引兜底(冲突方静默)
- wx code2session 需配置 WX_APPID/WX_SECRET;未配置时 dev 模式 code 即 openid
- 密码哈希暂用 bcryptjs;切换 Argon2id 见 10 号文档依赖建议
- 腰牌号店内唯一**含软删档案**(uk_badge 不滤 deleted_at):删除后同号重建一律 40901,防止流水归属混淆

## 验证命令

```bash
pnpm type-check          # tsc --noEmit
# e2e(服务已启动后;凭据经环境变量,不嵌入源码):
LEISURE_E2E_PHONE=13103790379 LEISURE_E2E_PASSWORD='ChangeMe@2026' \
  ./node_modules/.bin/vitest run test/api.e2e.test.ts            # 阶段1-B(7 用例)
LEISURE_E2E_PHONE=13103790379 LEISURE_E2E_PASSWORD='ChangeMe@2026' \
LEISURE_E2E_FINANCE_PHONE=13103790380 \
  ./node_modules/.bin/vitest run test/session-fee.e2e.test.ts    # 阶段2(7 用例)
# 冒烟(服务启动后)
curl -s http://localhost:3001/api/v1/auth/admin/login -H 'Content-Type: application/json' \
  -d '{"phone":"13103790379","password":"ChangeMe@2026"}'
```
