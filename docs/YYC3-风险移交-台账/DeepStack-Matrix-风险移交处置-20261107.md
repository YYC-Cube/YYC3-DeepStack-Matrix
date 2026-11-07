# YYC³ DeepStack-Matrix · 风险移交处置台账（2026-11-07）

> **性质**:apps 仓 sess_f72ee779 会话组跨仓分析产出的《DeepStack-Matrix-风险移交清单-20261107》(v1.0.0,7 项)由本仓维护会话接收处置的本台账。
> **移交清单原文**:apps 仓 `docs/yyc3-apps-glm53-20261106/attachments/DeepStack-Matrix-风险移交清单-20261107.md`(只读产出,未随文复制,以原文为准)
> **接收时点**:本仓 HEAD = `b99e5f7`(移交分析时点 `eecf734` 之后 2 笔);apps 仓 HEAD = `c54293e`
> **处置会话**:DeepStack-Matrix 维护会话(sess_0d90d8e3 延续,2026-11-07)

## 一、逐项处置结论

| # | 级别 | 移交项 | 处置结论 | 证据 |
| ---- | ---- | ---- | ---- | ---- |
| 1 | 🔴 高 | 生产预置口令 123456 落码 | **本会话收口**(见 §二):强制改密闸已在位,gist 为补「24h 预置时限」封死首登竞态接管窗口;`123456` 字面量的合法残留仅 2 处——弱口令黑名单(auth.module WEAK_PASSWORDS,防改回)+ staff 预设函数(Owner 2026-11-06 裁决,哈希落库+mustChangePassword+24h 时限),移交建议的「复扫清零」按此口径修正为「攻击面清零」 | commit 本笔;验证矩阵 §二.3 |
| 2 | 🟡 中 | gates 门禁名单滞后 | **复核维持**:G2/G4/mock 仍写死四端(`verify-gates.sh:11,19,26`),app-mp-artist/app-leisure-web 未入;i18n 扫描(`:30`)含 10 包但缺两新应用路径。**待办队列首位(脚本项)** | scripts/verify-gates.sh 实测 |
| 3 | 🟡 中 | 三版本线并存 | **复核维持**:家族线 react 19.2.5 · leisure 线 react 19.3.0 · app-mp-artist react 18.3.1(Taro);TS 家族/leisure 均已 5.9.3(较移交时点已收敛一项)。收敛目标线裁决**待 Owner** | 各 app package.json 实测 |
| 4 | 🟡 中 | 包级测试缺口 | **复核维持**:13 包中仍仅 leisure-core 3 个测试文件。分层覆盖率门禁(85/80/60)随 P1 Packages 骨架批次一并排期 | find packages 实测 |
| 5 | ⚪ 低 | 跨域包依赖 3 处 | **复核维持**:ops→ide、monitor→ai-family+ops、shell→admin+ide 实测在位。dependency-cruiser 边界规则随 P1 批次;逐个裁决待 Owner | packages/*/package.json 实测 |
| 6 | ⚪ 低 | dependabot PR 回摆 | **确认在案**:05b5645(merge #4)→ 9d9fbe6(revert)链完整;原因=合并后构建失败未预检。流程修正:依赖升级 PR 一律先跑 `bash scripts/verify-gates.sh` 快检 | git log |
| 7 | ⚪ 低 | README 品牌叙事不一致 | **复核维持**:README 头图 alt/title 仍「CloudPivot Intelli-Matrix」vs 仓 slug DeepStack-Matrix。建议加注「DeepStack-Matrix = CloudPivot Matrix 的 monorepo 底座实现」(低成本)或定名裁决(待 Owner) | README.md:3 |

## 二、🔴 预置口令项处置详情

### 2.1 现状核实(接收时)

移交时点推断的「明文落码无防护」在 `b99e5f7` 已部分过时——9513eb1 批次实际已带:bcrypt 哈希落库、`mustChangePassword` JWT 旗标、guard 层白名单(`PASSWORD_CHANGE_ALLOWLIST` = 改密/me,其余 40302)、改密强度策略(`123456` 入 WEAK_PASSWORDS 黑名单不可改回)、登录 5 错锁 15 分钟。**真实残余风险 = 首登竞态窗口无上界**:建号/重置到真实员工首登之间,知手机号者可抢先登录改密完成账号接管。

### 2.2 本会话收口(不推翻 Owner 裁决,给窗口加上界)

- **迁移** `20261107023500_preset_password_ttl`:`admin_user` 增 `preset_at`;**存量回填**——已标必改而无预置时间的 49 个账号以迁移部署时刻起算;
- **时限闸**(auth.module adminLogin,密码验证通过后):`mustChangePassword && presetAt 超 PRESET_PASSWORD_TTL_HOURS(默认 24h,env 可调)` → `40301 初始口令已超时未修改,账号冻结,请联系管理员重置`;改密成功(mustChange=false)后免疫;
- **签发点**:staff 建号/重置密码、seed 管理员/财务/幂等升级分支/e2e 账号,一律写 `presetAt=now`(管理员重置=重开 24h 窗口);
- **部署红线**:生产常驻进程(本机 3002,prod env)内存为旧代码;**重启前必须先对生产库应用迁移**,否则 Prisma 查询 `preset_at` 列缺失会炸登录。

### 2.3 验证矩阵(全绿)

| 用例 | 操作 | 期望 | 实测 |
| ---- | ---- | ---- | ---- |
| 窗口内首登 | seed 后立即登录 | 200 + mustChangePassword=true | ✅ |
| 超时冻结 | presetAt 拨回 25h 登录 | 40301 冻结文案 | ✅ |
| 窗口重开 | seed/管理员重置后登录 | 200 | ✅ |
| 强制改密闸 | mustChange token 调 /artists | 40302 | ✅ |
| 改密 | change-password 强密码 | 200 + 新 token | ✅ |
| 改密后免疫 | presetAt 拨回 48h + 新密码登录 | 200(mustChange=false 短路) | ✅ |

## 三、双仓协同注记(对应移交清单 §协同)

1. **HEAD 基线互登记**:apps 仓 = `c54293e`(feat(ops): P2 Stage-B 迁移,与 origin/main 同步)· 本仓(接收时)= `b99e5f7` → 本笔处置后为新 HEAD。两仓收敛裁决前不做单侧演进;
2. apps 仓 P1(Packages workspace 骨架)借鉴范围:仅读本仓根配置形态(pnpm-workspace.yaml allowBuilds/overrides/auditConfig)与 gates 脚本模式——**注意 g2/g4 名单滞后(#2)未修前,其 gates 模式不建议照抄**;
3. music 试点两条路仍为 Owner 待裁决项,本台账不预设结论。

## 四、待办队列(本仓)

1. gates 名单改 glob/显式追加(#2,脚本项,建议随下次发版批);
2. 版本收敛目标线(#3)+ 跨域依赖逐个裁决(#5)——待 Owner;
3. 包级测试分层门禁(#4)——随 P1 批次;
4. README 品牌加注(#7)——低成本,可随手批次带上;
5. **部署提醒**:生产实例重启前先迁移(§2.2 部署红线)。

## 变更记录

| 版本 | 日期 | 说明 | 作者 |
| ---- | ---- | ---- | ---- |
| v1.0.0 | 2026-11-07 | 初版:接收 7 项移交;#1 本会话收口(迁移+时限闸+验证矩阵);#2-#7 复核定性并入待办队列;登记 apps 仓 HEAD 基线 c54293e | DeepStack-Matrix 维护会话 |
