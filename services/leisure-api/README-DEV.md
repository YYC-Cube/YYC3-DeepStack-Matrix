# YYC³ LeisureAPI · 开发速查(README-DEV)

> 阶段1 骨架:auth + artist + attendance 三模块已实现;session/stage-fee/approval/report 为阶段2+。

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
cp .env.example .env          # DATABASE_URL 密码改为 leisure-dev-only(与 compose 一致)
pnpm prisma:generate
pnpm prisma:migrate --name init   # 需影子库权限:全新数据卷由 docker/mysql-init 自动
                                 # 授权;老卷手动执行 GRANT ALL ON *.* TO 'leisure'@'%'
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

统一响应:`{ code: 0, msg: "ok", data: … }`(全局 TransformInterceptor 包裹,幂等回放体同样单层信封);错误码对齐 04 文档。公开路由(免 token)仅 `auth/admin/login`、`auth/wx/login`,以 `@Public()` 标注,其余全部过 JwtGuard。

## 已知边界(阶段2+ 解决)

- session/stage-fee/approval/ticket/report 模块未实现(见 10 号文档 §二)
- 实时看板"上钟/串台/被选中"待 session 模块接通
- Idempotency 拦截器的并发首写竞争由唯一索引兜底(冲突方静默)
- wx code2session 需配置 WX_APPID/WX_SECRET;未配置时 dev 模式 code 即 openid
- 密码哈希暂用 bcryptjs;切换 Argon2id 见 10 号文档依赖建议

## 验证命令

```bash
pnpm type-check          # tsc --noEmit
pnpm test                # vitest(骨架期以 e2e 为主,随写随留)
# 冒烟(服务启动后)
curl -s http://localhost:3001/api/v1/auth/admin/login -H 'Content-Type: application/json' \
  -d '{"phone":"13103790379","password":"ChangeMe@2026"}'
```
