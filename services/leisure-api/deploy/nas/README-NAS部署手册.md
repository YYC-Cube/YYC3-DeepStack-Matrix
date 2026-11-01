# YYC³ LeisureManage · NAS(yyc3-45)部署手册(2026-11-02 实测回填版)

> **拓扑(实测)**:API 容器跑在 NAS `/Volume3/docker/yyc3-leisure-api/`(V3 NVMe,DockerEngine 由 TOS 托管,CLI 在 `/Volume3/@apps/DockerEngine/dockerd/bin/`);
> **PG15 主库 = 本机(Mac)的 Homebrew PostgreSQL@15,端口 5433**,监听 `*:5433`;**NAS 192.168.3.45 为流复制备库(只读)**。
> **主库地址走 Tailscale 固定 IP `100.87.159.21`**(Mac 的 LAN IP 会变网段,已实测 192.168.3.x/192.168.1.x 漂移;Tailscale 稳定)。
> pg_hba 已加两条**仅限本项目**规则(库 `leisure` + 角色 `leisure`/`leisure_app` + 100.64.0.0/10 + scram),reload 不重启;备份留 `pg_hba.conf.bak-*`。
> SSH:`YYC3@100.65.172.88`(uid=0)。命名遵循 NAS《docker项目-容器-镜像说明及命名说明规范》:三名合一 `yyc3-leisure-api`。
> 凭据:真值只入 `~/.yyc3-keybackup/leisure-prod.env`(600);变量逐项说明见 [ENV-生产变量说明.md](ENV-生产变量说明.md)。

## 0. 状态(2026-11-02 实测勾选)

- [x] 密钥已生成:`~/.yyc3-keybackup/leisure-prod.env`(JWT 双密钥/SCENE_HMAC/DB 双口令;CORS=https://lm.0379.pro,https://lm.0379.world)
- [x] 主库 bootstrap:`bash services/leisure-api/scripts/pg-prod-bootstrap.sh --host 127.0.0.1 --port 5433 --superuser yanyu`(角色 leisure/leisure_app + 库 leisure,幂等)
- [x] 主库 migrate deploy + `apply-pg-grants.sql`(只增表收权,已实测 DELETE 被拒)+ `NODE_ENV=prod seed`(测试账号自动跳过;38 表;两个正式账号均强制改密)
- [x] NAS 代码快照:**最小构建集**(workspace 清单 21 个 package.json + leisure-core + leisure-api,1.8 MB)→ `/Volume3/docker/yyc3-leisure-api/src/`(整仓 12 GB 含 docs/apps 素材,勿整仓 rsync)
- [x] NAS 首次镜像构建:`yyc3-leisure-api:1.0.0-rc.1`(eb950499818c;pnpm install 57s @npmmirror;Docker Compose v5.1.2)
- [x] 容器起 + 冒烟:`yyc3-leisure-api`/`yyc3-leisure-redis` **healthy**;`listening on :3001 (env prod, cors 2 origins)`;auth/me 401;正式账号登录 `mustChangePassword=true`、业务接口 40302;日切 job 已在生产库物化昨日汇总(证明 API→主库 Tailscale+scram 连通)
- [x] **公网网关已通(2026-11-02)**:两域名 443(api 401/web 200/h5 200,Let's Encrypt 双域 SAN 证书);链路 Traefik→edge nginx→frp 8801→NAS(见 §6)
- [ ] Owner 首登改密(改 `13103790379`/`13103790380` 默认口令)· 删除 seed 示例艺人(可选)· 盒子/微信正式凭据

## 1. 代码快照(本机执行;代码与部署分离)

```bash
cd /Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix
ssh YYC3@100.65.172.88 'mkdir -p /Volume3/docker/yyc3-leisure-api/{src,data/redis}'
rsync -az --delete --exclude node_modules --exclude .git --exclude dist --exclude '**/dist' \
  --exclude dist-electron --exclude .vite --exclude coverage --exclude '*.log' \
  ./ YYC3@100.65.172.88:/Volume3/docker/yyc3-leisure-api/src/
scp ~/.yyc3-keybackup/leisure-prod.env YYC3@100.65.172.88:/Volume3/docker/yyc3-leisure-api/.env.production
ssh YYC3@100.65.172.88 'cp /Volume3/docker/yyc3-leisure-api/src/services/leisure-api/deploy/nas/docker-compose.yml /Volume3/docker/yyc3-leisure-api/ && chmod 600 /Volume3/docker/yyc3-leisure-api/.env.production'
```

## 2. 数据库(已完成;重放用)

```bash
cd services/leisure-api
bash scripts/pg-prod-bootstrap.sh --host 127.0.0.1 --port 5433 --superuser yanyu     # 建角色/库(幂等)
OWNER_URL=$(grep -E '^DATABASE_URL_OWNER=' ~/.yyc3-keybackup/leisure-prod.env | cut -d= -f2-)
DATABASE_URL="$OWNER_URL" pnpm exec prisma migrate deploy
psql -h 127.0.0.1 -p 5433 -U yanyu -d leisure -f scripts/apply-pg-grants.sql
DATABASE_URL="$OWNER_URL" NODE_ENV=prod pnpm exec prisma db seed
```

## 3. 主库安全备注

- 已知弱点:`pg_hba` 既有 `host all all 192.168.3.0/24 trust`(内网免密)——**未动**(可能有其他 LAN 应用依赖);
  本项目已用更严格的专属规则覆盖(库+角色+Tailscale 段+scram)。建议后续逐应用收紧该 trust 行。
- 主库跑在会换网段的机器上:**一律用 Tailscale IP 连**;`listen_addresses='*'` 保持。

## 4. 构建并启动(在 NAS)

```bash
export PATH=/Volume3/@apps/DockerEngine/dockerd/bin:$PATH     # TOS docker CLI 不在默认 PATH
cd /Volume3/docker/yyc3-leisure-api
$PWD/../@apps/DockerEngine/dockerd/bin/docker compose --env-file .env.production up -d --build 2>&1 | tee build.log
# 或分步:docker compose build api && docker compose up -d
docker logs -f yyc3-leisure-api        # 期待: listening on :3001 (env prod, cors 2 origins)
docker save yyc3-leisure-api:1.0.0-rc.1 -o yyc3-leisure-api-1.0.0-rc.1.tar   # 规范:镜像 tar 备份
```

> 首次构建已按国内环境预置:`BASE_REGISTRY=docker.1ms.run/library`(node 基础镜像)、npm 走 npmmirror、Prisma 引擎走 npmmirror 二进制镜像(Dockerfile ARG 可覆盖)。
> 预计 5–20 分钟(NVMe + 全量 install);若 `--filter` 与 lockfile 报错,退化为 `pnpm install --frozen-lockfile`(全量,镜像大但零风险)。
> 镜像源不通时的替换:`--build-arg BASE_REGISTRY=docker.io/library --build-arg NPM_REGISTRY=https://registry.npmjs.org`。

## 5. 冒烟清单(逐项打勾)

1. NAS 上:`curl -s -o /dev/null -w '%{http_code}' http://192.168.3.45:3001/api/v1/auth/me` → **401**(容器健康检查同款)
2. 健康状态:`docker inspect -f '{{.State.Health.Status}}' yyc3-leisure-api` → healthy
3. 管理端登录(经网关后)→ 强制跳改密页 → 改密成功进入
4. 房态看板开房(轮台队列出现)→ 自点单 → 关房结算单(预览=真结算)→ ROOM_SETTLE 流水 → 清扫
5. 台票购买/核销;预约到店;评价录入;双轨对账 14 天面板
6. 钟房大屏语音 + `POST /voice-box/test`(配 VOICE_BOX_URL 后)
7. 备库只读抽查(NAS):`psql 备库 -c 'select 1'` 可读、写报错

## 6. 网关与域名(2026-11-02 实测已通)

- **拓扑**:边缘 `yyc3-33`(阿里云 ECS 39.97.53.176,**Traefik v3 file-provider 终止 TLS**)→ 边缘 nginx 容器 `yyc3-leisure-edge`(127.0.0.1:8070,静态+API 分流)→ **frp 隧道**(NAS `yyc3-leisure-frpc` → ECS frps **8801**)→ NAS API 3001
- 域名:`lm.0379.world`(主)/`lm.0379.pro`(别名)——同一张 Let's Encrypt 证书双域 SAN(自动签发);`/` Web 管理端 · `/m/` 艺人端 H5 · `/api/v1` API
- ECS 侧资产:`/root/yyc3-leisure-edge/`(compose+nginx.conf+web/+h5/);Traefik 路由在 `/root/0379-world/traefik/dynamic.yml`(追加 `leisure-web` 路由,原文件自动留 bak)
- NAS 侧:`frpc.toml`(token 只存 NAS 600 文件,不入仓库)+ compose `frpc` 服务
- CORS_ORIGINS=两域名;H5 `TARO_APP_API_BASE=https://lm.0379.pro/api/v1` 编译期内联(CORS 预检 204 实测)
- 公网验证:两域名 api 401 / web 200 / h5 200,ssl_verify=0;ECS 安全组如未放行 8801 也无碍(仅 Traefik 80/443 面向公网)

## 7. 备份与回退

- 备份以主库为准(本机):`pg_dump` 每日 → NAS V1 备份池;WAL 归档 ≥7 天
- 回退:镜像 tag 固定(`yyc3-leisure-api:1.0.0-rc.1`),回退即换 tag 重启;迁移只加列,旧镜像兼容
- 日志:compose json-file 20MB×5 轮转;资金争议以审计表为准账

## 8. 已知边界(如实)

- NAS 镜像**首次构建仍在进行/待验证**(§4);pnpm `--filter` 在 TOS 环境如遇 lockfile 解析问题按退化方案
- seed 含 3 个示例艺人档案(晨曦/雨露/星辰,均未审核)——生产不需要可在「艺人资料管理」软删
- 消息推送矩阵/CRM 等 P1/P2 见 15 号审核文档 §五
