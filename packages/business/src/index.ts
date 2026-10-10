/**
 * file: index.ts
 * description: @yyc3/business 主 barrel · 统一导出业务域件（hotel-engines + comm-station）
 * author: YanYuCloudCube Team
 * version: v1.0.1
 * created: 2026-10-10
 * updated: 2026-10-10
 * status: active
 * tags: [business],[barrel]
 */

// 酒店业务引擎束（ai-family 域亦消费，单向依赖）
export * from "./hotel-engines/ai-family-hotel-manager";
export * from "./hotel-engines/ai-family-hotel.types";
export * from "./hotel-engines/ai-learning-engine";
export * from "./hotel-engines/hotel-knowledge-base";
export * from "./hotel-engines/hotel-voice-service";

// 通讯基站面板
export { CommStationPanel } from "./comm-station-panel";
