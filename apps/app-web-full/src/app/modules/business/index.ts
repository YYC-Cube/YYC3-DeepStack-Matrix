/**
 * file: index.ts
 * description: Business 模块 barrel 文件 · 统一导出业务场景相关组件
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-07-25
 * updated: 2026-07-25
 * status: active
 * tags: [module],[business],[barrel]
 */

// 酒店管理（暂缓包化，见 phase4-ledger/02 D4：M4-6 与 ai-family 同窗处理）
export { HotelDashboard } from '@yyc3/ai-family/hotel-dashboard';

// 通讯站（@yyc3/business 包化，M4-2b）
export { CommStationPanel } from '@yyc3/business/comm-station-panel';