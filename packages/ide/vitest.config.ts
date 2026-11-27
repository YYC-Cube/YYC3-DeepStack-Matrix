/**
 * @file: vitest.config.ts
 * @description: @yyc3/ide 测试配置 — jsdom + istanbul 覆盖率（vitest 与 coverage provider 版本 lockstep）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @updated: 2026-11-27
 * @status: active
 * @tags: [ide],[test],[vitest]
 *
 * @brief: 团队标准 85% 三项（行/分支/函数）门禁；导出面冒烟 + 核心逻辑用例（85% 冲刺留后续批次）
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['src/__tests__/setup.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**'],
      exclude: ['src/__tests__/**', 'src/**/*.d.ts'],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
