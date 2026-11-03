# YYC³ LeisureAPI · 生产环境变量完整说明（lm.0379.pro / lm.0379.world）

> **原则（密钥纪律）**：真值只存 `~/.yyc3-keybackup/leisure-prod.env`（600，本机生成）；仓库与示例文件只有占位。
> **生成方式**：`bash services/leisure-api/scripts/gen-prod-secrets.sh`（openssl 强随机；已执行，见 §三）。
> **域名**：`lm.0379.pro`（Web 管理端）/ `lm.0379.world`（销售经理端 H5）→ 边缘网关 `39.97.53.176`（ICP 备案见 §六）。
> **拓扑**：边缘网关(公网) → NAS `yyc3-45`(100.65.172.88, 内网 192.168.3.45) Docker 层 API 容器 → **PostgreSQL 15 主库（本机 192.168.3.22:5433，NAS 备库只读）**。

---

## 一、文件与流转

| 位置 | 内容 | 权限 |
|---|---|---|
| `~/.yyc3-keybackup/leisure-prod.env`（本机） | **真值唯一来源**（gen 脚本产物） | 600 / 目录 700 |
| NAS `/Volume3/docker/yyc3-leisure-api/.env.production` | 部署时从上一文件拷贝（scp） | 600 |
| `services/leisure-api/deploy/nas/.env.production.example` | 占位样例（入 git） | — |
| `services/leisure-api/scripts/gen-prod-secrets.sh` | 生成器（--force 轮换，旧文件自动留 .bak） | — |
| `services/leisure-api/scripts/pg-prod-bootstrap.sh` | 用真值口令在主库建角色/库（幂等） | — |

**流转命令**（本机 → NAS）：
```bash
scp ~/.yyc3-keybackup/leisure-prod.env YYC3@100.65.172.88:/Volume3/docker/yyc3-leisure-api/.env.production
ssh YYC3@100.65.172.88 'chmod 600 /Volume3/docker/yyc3-leisure-api/.env.production'
```

---

## 二、变量逐项说明（含生成/轮换）

| 变量 | 必填 | 说明 |
|---|---|---|
| `NODE_ENV` | ✅ | 固定 `prod`；触发启动硬化校验（§五） |
| `PORT` | ✅ | 容器内端口 3001（compose 只绑 127.0.0.1，经 nginx 反代） |
| `DATABASE_URL` | ✅ | `postgresql://leisure_app:<APP口令>@192.168.3.22:5433/leisure?schema=public`；**API 运行账号**，对流水/审计/台票表无 UPDATE/DELETE |
| `DATABASE_URL_OWNER` | 仅迁移 | `postgresql://leisure:<OWNER口令>@…`；**只在执行 migrate/seed 时手工使用**，不进 API 容器 |
| `LEISURE_DB_OWNER_PASSWORD` / `LEISURE_DB_APP_PASSWORD` | ✅ | 两个角色的口令原文（bootstrap 脚本消费；生成器产出，32 位无符号字母数字） |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | ✅ | 64 字符 base64 随机；access 2h / refresh 7d；**轮换=重生成+全员重登** |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | ✅ | 默认 2h / 7d |
| `SCENE_HMAC_KEY` | ✅ | 报备现场屏二维码 scene 签名（HMAC-SHA256），64 字符随机 |
| `CORS_ORIGINS` | ✅ | `https://lm.0379.pro,https://lm.0379.world`（与网关域名严格一致；prod 缺失即拒启） |
| `SWAGGER_ENABLED` | ✅ | `false`（生产默认关；排障临时开，办完即关） |
| `BUSINESS_DAY_CUT` 等 8 项业务默认 | ✅ | 与门店口径一致；门店级「销售经理设置」可覆盖 |
| `VOICE_BOX_URL` | 可空 | 盒子私网地址模板 `http://<盒内网IP>/tts?text={text}`；留空=仅大屏 Web Speech |
| `VOICE_BOX_TIMEOUT_MS` | ✅ | 3000 |
| `WX_APPID` / `WX_SECRET` | 上线前 | 微信小程序正式凭据；未填时 wx 登录为 dev 骨架（生产必须填） |
| `REDIS_URL` | 免填 | compose 注入 `redis://redis:6379` |

---

## 三、当前生成状态（2026-11-02 已执行）

```
~/.yyc3-keybackup/leisure-prod.env  (600)
  JWT_SECRET         L2NK…550y (64)
  JWT_REFRESH_SECRET OAZs…N/kc (64)
  SCENE_HMAC_KEY     JFPb…RF+S (64)
  DB owner pwd       GviB…XXr6 (32)
  DB app pwd         uFIG…gkOm (32)
  CORS_ORIGINS       https://lm.0379.pro,https://lm.0379.world
```
> 以上为脱敏摘要；完整值只在密钥文件里。**下一步**：`bash scripts/pg-prod-bootstrap.sh` 建库建角色 → 主库 `migrate deploy`。

---

## 四、轮换手册

| 对象 | 操作 | 影响 |
|---|---|---|
| JWT 双密钥 | 改 keybackup 文件 → 重启 API | 全员重新登录 |
| SCENE_HMAC_KEY | 同上 | 现场屏旧二维码 60s 内失效（本来就有时间窗） |
| DB app 口令 | keybackup 改 → `ALTER ROLE leisure_app`（psql 变量法，同 bootstrap）→ 重启 API | 在线连接断开重连 |
| DB owner 口令 | 同上（ALTER ROLE leisure） | 仅迁移流程受影响 |
| 轮换留痕 | 生成器自动存 `.bak-<时间戳>`（600） | — |

---

## 五、prod 启动硬化（代码强制，非文档约束）

`NODE_ENV=prod` 时，以下任一情况 **API 拒绝启动**：
- JWT 双密钥 / SCENE_HMAC_KEY 长度 <32 或含 `dev-only|change-me|CHANGE_ME|example`
- `DATABASE_URL` 含 `dev-only` 等开发口令痕迹
- `CORS_ORIGINS` 缺失或为空

---

## 六、域名与 ICP 备案（39.97.53.176）

- `39.97.53.176` 为**阿里云北京**公网 IP：对中国大陆服务器 **80/443 提供 Web 服务，域名必须已完成 ICP 备案**（主体+域名均需备案，接入商选阿里云）。
- `.pro` / `.world` 均可备案（非限制后缀），但**备案周期约 1–3 周**；未备案前 80/443 会被接入商阻断。
- 备案完成前的过渡方案（三选一）：
  1. **内网/Tailscale 直连**（推荐先行）：`http://100.65.172.88`（NAS nginx）直用，不经公网，无备案要求；
  2. 云上用**非标准端口**（如 `:8443`）——阿里云对未备案域名的非标端口仍可能核查，不保证；
  3. 使用已备案的其他域名先挂 CNAME。
- **建议**：立即发起 `lm.0379.pro` / `lm.0379.world` 的备案；期间用 Tailscale 直连完成上线联调，备案下来切公网。

---

## 七、TLS 证书

- 边缘网关（39.97.53.176 nginx）用 **Let's Encrypt**（`certbot --nginx -d lm.0379.pro -d lm.0379.world`，DNS 解析先指向 39.97.53.176）
- NAS 内网段可自签或复用边缘证书（内部流量经 WireGuard/Tailscale 加密）
