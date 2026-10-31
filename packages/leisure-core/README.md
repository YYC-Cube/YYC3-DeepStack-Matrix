# @yyc3/leisure-core

> YYC³ LeisureManage 领域单源包 · Web 管理后台 / PWA / Taro 艺人小程序 / 后端 四端共同依赖
> 依据:智慧商家 App「艺人管理」25 子模块实测(2026-11-01)

## 能力

| 模块 | 导出 | 说明 |
|---|---|---|
| 营业日 | `resolveBusinessDate` `businessDateRange` `shiftBusinessDate` `millisSinceBusinessDayStart` | 08:00 日切口径单源(实测口径);禁止各端自行推算 |
| 台费引擎 | `resolveStageFeeRule` `calcSessionFee` `assertCanTakeSession` `sumFeeBalance` | 等级×房型规则解析 · FLAT/HOURLY 计费 · 最低时长保底 · 上钟前置校验(串台 0=不允许等实测语义) |
| 台票 | `ticketBalance` `calcPurchaseAmount` `canUseTicket` | 余额聚合/购买金额/过期校验 |
| 流水类型 | `FeeTxnType` `TicketTxnType` `PayChannel` `REPORT_TYPES`(9 枚举) `RealtimeStatus`(5 色点) | 全端枚举一致性的锚 |
| API Client | `LeisureApiClient` + `FetchTransport`(Web) | 传输层注入式:Taro 端实现同接口 Transport 即可;幂等键内置 |

## 用法

### Web 管理后台 / PWA

```ts
import { LeisureApiClient, FetchTransport } from '@yyc3/leisure-core'

const client = new LeisureApiClient(new FetchTransport({ baseUrl: '/api/v1', getToken }), {
  baseUrl: '/api/v1',
  getToken,
  cutTime: '08:00',
})
```

### Taro 艺人小程序

```ts
import Taro from '@tarojs/taro'
import { LeisureApiClient, type Transport } from '@yyc3/leisure-core'

const taroTransport: Transport = {
  request<T>(req) {
    return Taro.request({
      url: baseUrl + req.path,
      method: req.method,
      data: req.body,
      header: { /* token/idempotency */ },
    }).then((res) => {
      const json = res.data
      if (json.code !== 0) throw new LeisureError(json.code, json.msg)
      return json.data as T
    })
  },
}
```

## 纪律

1. 领域逻辑**只允许**写在本包(营业日/计费/校验/枚举),任何端不得复制实现
2. 金额一律 `number`(分为单位可后续演进);展示格式化放各端 UI 层
3. 错误统一 `LeisureError`(code 对齐 04-API 文档);UI 层按 code 映射文案
4. 时间入参支持 `Date | ISO string`;**时区语义 = 门店本地时区**
