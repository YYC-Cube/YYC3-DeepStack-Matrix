/**
 * @file: index.ts
 * @description: i18n 出口 — zh-CN 为类型源 + useI18n 运行时（三端 L0 上收）
 * @author: YanYuCloudCube Team
 * @version: v1.1.0
 * @created: 2026-04-08
 * @updated: 2026-10-10
 * @status: active
 * @tags: [module],[i18n]
 */

export { default as zhCN } from "./zh-CN";
export type { TranslationKeys } from "./zh-CN";
export { default as enUS } from "./en-US";
export {
  useI18n,
  useI18nProvider,
  I18nContext,
  SUPPORTED_LOCALES,
} from "./useI18n";
