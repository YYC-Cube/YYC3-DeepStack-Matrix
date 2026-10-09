/**
 * @file: index.ts
 * @description: @yyc3/theme barrel — design-system（token 目录+工具）为主动入口；tokens 为生成单源；colors 为兼容旧 API
 * @author: YanYuCloudCube Team
 * @version: v0.1.1
 * @created: 2026-10-10
 * @updated: 2026-10-10
 * @status: active
 * @tags: [theme],[barrel]
 */
export * from "./design-system";
export * from "./colors";
// C 不自此导出（colors.ts 的 C+alpha 为超集）；CHART/FAMILY 单源显式导出，避免 star-export 歧义
export { CHART_COLORS, FAMILY_COLORS } from "./colors.generated";
