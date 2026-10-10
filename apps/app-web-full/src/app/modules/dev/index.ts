/**
 * @file: index.ts
 * @description: Dev 模块入口 — 统一导出所有公共 API
 * @author: YanYuCloudCube Team
 * @version: v1.0.0
 * @created: 2026-07-25
 * @updated: 2026-07-25
 * @status: active
 * @tags: [module],[dev],[barrel]
 *
 * @brief: Dev 开发工具独立功能模块
 *
 * @details:
 * - 设计系统 (Design System)
 * - 主题定制 (Theme Customizer)
 * - CLI 终端 (CLI Terminal)
 * - IDE 面板 (IDE Panel)
 * - 重构报告 (Refactoring Report)
 * - 架构审计 (Architecture Audit)
 * - 开发指南 (Dev Guide)
 */

// 路由
export { devRoutes } from './routes';

// 页面组件
export { DesignSystemPage } from './design-system/DesignSystemPage';
export { DevGuidePage } from './DevGuidePage';
export { ThemeCustomizer } from './ThemeCustomizer';
export { CLITerminal } from './CLITerminal';
export { IntegratedTerminal } from './IntegratedTerminal';
export { IDEPanel } from '@yyc3/ide';
export { RefactoringReport } from './RefactoringReport';
export { ArchitectureAudit } from './ArchitectureAudit';

// IDE 子模块
export { IDELayout } from '@yyc3/ide/ide-layout';
export { IDETopBar } from '@yyc3/ide/ide-top-bar';
export { IDEStatusBar } from '@yyc3/ide/ide-status-bar';
export { IDESettingsPanel } from '@yyc3/ide/ide-settings-panel';

// Hooks
export { useTerminal } from '@yyc3/ide/hooks/use-terminal';

// Theme 子模块
export { ColorSwatch } from '@yyc3/ide/theme/color-swatch';
export { ColorPicker } from '@yyc3/ide/theme/color-picker';
export { formatOklch, hexToOklch, oklchToHex } from '@yyc3/ide/theme/color-utils';
export {
  DEFAULT_BRANDING,
  DEFAULT_COLORS,
  DEFAULT_SHADOW,
  DEFAULT_TYPOGRAPHY,
  THEME_PRESETS,
} from '@yyc3/ide/theme/theme-presets';
export type {
  BrandingConfig,
  ThemeColors,
  ThemePreset,
  ThemeShadow,
  ThemeTypography,
} from '@yyc3/ide/theme/theme-presets';