# YYC³ LeisureManage · NAS(yyc3-45)部署手册

> 目标拓扑:**API 容器跑在 NAS V3(Docker 应用层)**;**PostgreSQL 15 主库在宿主主机 5433**(192.168.3.22,Homebrew),**NAS 192.168.3.45 为流复制备库(只读,不可写)**;NAS 内网 `100.65.172.88`(Tailscale)。SSH:`YYC3@100.65.172.88`。
> 版本:2026-11-02(随 15 号审核 P0-2 交付)|约束:真值凭据只入 `~/.yyc3-keybackup`(600),仓库只放占位。

## 0. 前置确认(一次性)

- [ ] NAS Docker 层目录存在(V3 NVMe):本文以 `$NAS_APP=/volume3/docker/leisure` 为例,按实际挂载调整
- [ ] 宿主主库 `leisure` 数据库已创建,且已建立到 NAS 的流复制(现网已具备)
- [ ] 生成强随机密钥:`openssl rand -base64 48` ×3(JWT_SECRET/JWT_REFRESH_SECRET/SCENE_HMAC_KEY),连同 DB 口令写入 `~/.yyc3-keybackup/leisure-prod.env`(600)
- [ ] GitBucket(NAS)上建仓库或将本仓推上去(代码分发走内网 Git)

## 1. 拉代码(在 NAS)

```bash
ssh YYC3@100.65.172.88
mkdir -p $NAS_APP && cd $NAS_APP
git clone <GitBucket 内网地址>/YYC3/YYC3-DeepStack-Matrix.git && cd YYC3-DeepStack-Matrix
```

## 2. 准备环境变量

```bash
cd services/leisure-api/deploy/nas
cp .env.production.example .env.production
# 按样例逐项填写:DATABASE_URL(主库 5433) / JWT 双密钥 / SCENE_HMAC_KEY / CORS_ORIGINS / VOICE_BOX_URL / WX_APPID+SECRET
chmod 600 .env.production
```

## 3. 首次建库与账号最小化(在任意能连主库的机器执行)

```bash
# 3.1 迁移(所有者账号)
DATABASE_URL="postgresql://<OWNER>:<PWD>@<PRIMARY_HOST>:5433/leisure?schema=public" \
  pnpm --dir services/leisure-api exec prisma migrate deploy
# 3.2 种子(生产:NODE_ENV=prod 自动跳过 admin/china/e2epwd 测试账号)
DATABASE_URL="postgresql://<OWNER>:<PWD>@<PRIMARY_HOST>:5433/leisure?schema=public" NODE_ENV=prod \
  pnpm --dir services/leisure-api exec prisma db seed
# 3.3 运行账号最小化(流水/审计只增)
docker exec -i <宿主pg容器或psql直连> psql "$OWNER_URL" < services/leisure-api/scripts/apply-pg-grants.sql
```

> 初始管理员:手机号 `13103790379` / 默认口令 `ChangeMe@2026`,**首登强制改密(40302 拦截)**;正式启用前在「艺人设置」核对八项门店参数。

## 4. 构建并启动

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker logs -f leisure-api-prod        # 期待: listening on :3001 (env prod, cors N origins)
```

> 首次构建注意:镜像在 NAS 上全量 `pnpm install`,预计 5–15 分钟;若 `--filter` 与 lockfile 在个别 pnpm 版本上告警,可退化为全量 `pnpm install --frozen-lockfile`(镜像更大但零风险)。

## 5. 冒烟清单(逐项打勾)

1. `curl http://127.0.0.1:3001/api/v1/auth/me` → **401**(服务起,未带 token)
2. 管理端登录 → 强制跳改密页 → 改密成功进入
3. 房态看板开房(轮台队列出现)→ 自点单 → 关房结算单(预览=真结算)→ ROOM_SETTLE 流水 → 清扫
4. 台票购买/核销;预约到店;评价录入;双轨对账页 14 天面板
5. 钟房大屏语音 + `POST /voice-box/test`(配 VOICE_BOX_URL 后)
6. NAS 备库只读验证:`psql 备库 -c 'select 1'` 可读、写操作报错

## 6. 反向代理(网关)

- Web 管理端(3040 构建产物)与艺人端 H5 挂网关域名,`/api/v1` 反代到 `127.0.0.1:3001`
- CORS_ORIGINS 必须与两个前端域名完全一致(含协议);HTTPS 在网关终止
- 生产关闭 Swagger(`SWAGGER_ENABLED=false`),排障临时开

## 7. 备份与回退

- **备份以主库为准**(本机):`pg_dump` 每日 → NAS V1 备份池;binlog/WAL 归档保留 ≥7 天
- 回退:镜像 tag 固定(`leisure-api:prod`),回退即 `docker compose up -d` 上一 tag;迁移只加列不破坏,回滚旧镜像兼容
- 日志:compose json-file 20MB×5 轮转;异常以审计表为准账

## 8. 已知边界(如实)

- 艺人端 H5 `lib/api.ts` 的 API_BASE 当前为编译期字面量 `http://127.0.0.1:3001/api/v1` —— **发正式 H5 前需改为网关域名并重构建**(列入小程序真机回归批次)
- 生产首次构建在 NAS 上未实测,见 §4 注;`pnpm deploy` 瘦身为后续优化项
- 消息推送矩阵/CRM 等 P1/P2 见 15 号审核文档 §五
