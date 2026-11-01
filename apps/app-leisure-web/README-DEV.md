# YYC³ LeisureManage Web 管理端 · 开发速查(README-DEV)

> 阶段3 交付:A1-A20 页面 + 门店参数 + 包厢房号管理;@yyc3/ui 组件库 + @yyc3/leisure-core 单源客户端。
> 阶段4 交付:PWA(manifest/安装流)+ 移动断点 BottomNav + A15 报备现场屏全屏二维码页。

## 快速启动

```bash
# 前置:leisure-api 已启动(3001);本目录 node_modules 为指向 app-web-full 的符号链接
# (规避 pnpm install 改动根锁文件;版本天然对齐,勿提交该链接)
cd apps/app-leisure-web
../app-web-full/node_modules/.bin/vite --port 3040
# 打开 http://localhost:3040(登录后进入)
```

| 校验 | 命令 |
|---|---|
| 类型检查 | `./node_modules/.bin/tsc --noEmit` |
| 生产构建 | `./node_modules/.bin/vite build`(产物 dist/) |

## 默认账号(开发)

同 leisure-api seed:管理员 `13103790379` / 财务(审批第二人)`13103790380`,初始密码见 services/leisure-api/README-DEV(首登必改)。

## 页面清单(05 文档 A 编号)

| 域 | 页面 | 路由 | 说明 |
|---|---|---|---|
| 档案 | A1 艺人资料管理 | `#/artists` | 筛选含审核状态(§3);添加/编辑(A2 全字段表单,PUT 全量语义);审核流转;批量设置 |
| 档案 | A3 等级 / A4 组别 | `#/artists/levels` `#/artists/groups` | CRUD;有艺人挂靠禁删 |
| 考勤 | A19 实时看板 | `#/attendance/realtime` | 统计卡+名单,10s 轮询 |
| 考勤 | A16 报备明细 / A17 汇总矩阵 / A18 补打卡 | `#/attendance/reports` `#/attendance/summary` `#/attendance/manual` |  |
| 场次 | A20 艺人上下钟 | `#/sessions` | 代下钟(快照计费);串台标记;计费小时/单价/金额列(§8.3 维度) |
| 台费 | A5 台费规则 | `#/fees/rules` | 等级×房型矩阵+列表;40903 禁改提示 |
| 台费 | A7 充值 / A8 手动扣费 | `#/fees/recharge` `#/fees/deduct` | 幂等键防重;备注必填;≥阈值转审批(202+41201 引导文案) |
| 台费 | A9-A11 流水三查 | `#/fees/txns/RECHARGE|SESSION_DEDUCT|MANUAL_DEDUCT` | 汇总卡;冲正(反向流水) |
| 设置 | 门店参数(艺人设置 8 项) | `#/settings/artist` | 计费阈值等即时生效;进行中场次按快照 |
| 设置 | 包厢房号管理 | `#/store/rooms` | 40907 唯一;房态流转;手工置占用被拒 |
| 现场屏 | A15 报备现场屏 | `#/attendance/screen` | 全屏二维码(scene 60s 轮换防截屏)+ 实时签到流 + requestFullscreen;WX 凭据就绪后自动显示真小程序码(阶段5) |
| II 期+ | A6/A12-A14 台票域、A21-A25 | `#/todo/:key` | 占位页,标注里程碑归属 |

## PWA(阶段4)

- `public/manifest.webmanifest` + SVG 图标(any/maskable);index.html 含 apple-mobile-web-app 元信息
- 安装流:`src/lib/pwa.ts` 自建 usePWAInstall(beforeinstallprompt 捕获/iOS 指引/standalone 检测);顶栏「安装」按钮按能力显隐
- **注意**:`@yyc3/admin` 的 usePWAManager 为 mock 实现(假 SW/缓存数据),勿用于真实安装流;离线 Service Worker 属 II 期 P0(离线计时兜底),本期未引入
- 移动断点(<768px):Sidebar 隐藏 → 底部五 Tab(档案/看板/上下钟/流水/设置,permCodes 过滤)
- **已知陷阱**:@yyc3/ui Card 基类自带 `flex-col`,横向布局须显式加 `flex-row`;zustand 选择器不得返回新引用(如 `.bind(...)` → 无限重渲染 Maximum update depth)

## 已知边界

- 登录态存 localStorage(zustand persist);JWT 2h,401 自动登出回登录页
- 后端 Decimal 过 API 为字符串:前端统一 `num()/fmtMoney()` 收敛,负余额红色
- 金额写操作均带 Idempotency-Key(leisure-core `newIdempotencyKey` 单源)
- UI 自动化:本机 IAB(webview)存在**输入事件分发失效**的环境限制(新标签复现;渲染/JS/网络全通)——交互层验证用真实浏览器人工核验或独立 Playwright;渲染层已截图验收(登录页/A1 桌面+移动/A15 现场屏)
