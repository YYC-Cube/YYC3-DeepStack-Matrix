# YYC³ LeisureManage 艺人端小程序 · 开发速查(README-DEV)

> 阶段5 交付:Taro4 + React + TS;B1 注册绑定 / B2 扫码签到签退 / B4 我的流水;领域枚举/错误码 import @yyc3/leisure-core。

## 快速启动

```bash
# 本目录依赖用 npm 独立安装(不用 pnpm,不触根 pnpm-lock;leisure-core 经 file: 链接)
cd apps/app-mp-artist
npm install --no-audit --no-fund

# H5(dev 演示;hash 路由,dist 可静态托管)
npm run build:h5
cd dist && python3 -m http.server 10087   # http://127.0.0.1:10087/

# 微信小程序(产物 dist/,导入微信开发者工具;project.config.json 已置 urlCheck=false)
npm run build:weapp
```

## 默认演示路径(dev 骨架)

后端未配 WX_APPID 时,`code 即 openid`(dev 专用):首次进入自动以稳定伪 code 登录 → NEED_BIND → 输入腰牌号(如 A1001/雨露 A1002)完成绑定 → 后续进入即为已绑定态。

## 端点清单(src/lib/api.ts,全字面量 URL 逐一可审计)

| 页面 | 端点 | 说明 |
|---|---|---|
| B1 | POST /auth/wx/login | 未绑定返回 NEED_BIND+bindToken(15min) |
| B1 | POST /auth/wx/bind | bindToken+腰牌号/手机号;跨店冲突→转移工单(人工模式) |
| B2 | POST /attendance/checkin | 九宫格报备类型(leisure-core REPORT_TYPES 单源);geo 失败仍可签 |
| B2 | POST /attendance/checkout | 门店级签退时限,40905 文案透出 |
| B2 | GET /attendance/my-today | 本人今日报备状态卡 |
| B2 | GET /attendance/qrcode/verify | scene HMAC 签名+时间窗校验(防伪造) |
| B4 | GET /stage-fee/my | 本人余额+流水(强制本人,防水平越权) |

## 已知边界与裁决

- **传输层裁决**:PROMPT 原文"注入 TaroTransport";实施时 Mimosa 安全钩子连续拦截"变量拼 URL 进 Taro.request"的通用 Transport 形态(SSRF 模型),改为**每端点全字面量 URL + 显式清单**(更可审计);类型/枚举/错误码仍单源 import @yyc3/leisure-core。
- **存储适配**:Taro H5 getStorageSync 对外部写入的裸 JSON 行为不稳 → 自管存储适配器(H5 直用 localStorage,小程序端回落 Taro),统一 JSON 字符串存取。
- 离线排队重传(B-08)未入本期(05 文档 B2 描述项,列 II 期 P0 离线兜底);当前失败 toast+手动重试。
- 定位:Taro.getLocation(H5 环境失败即跳过,checkinGeoOk 由后端标记)。
- scene 签名密钥 SCENE_HMAC_KEY 走后端 env(默认 dev 值,生产必须替换)。
