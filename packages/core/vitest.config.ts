/**
 * @file: vitest.config.ts
 * @description: @yyc3-deepstack/core 测试配置 — jsdom + istanbul 覆盖率（vitest 与 coverage provider 版本 lockstep）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @updated: 2026-11-27
 * @status: active
 * @tags: [core],[test],[vitest]
 *
 * @brief: 团队标准 85% 三项（行/分支/函数）门禁
 *
 * @details:
 * - provider = istanbul（家族规范 lockstep；@vitest/coverage-istanbul 与 vitest 同版本）
 * - fake-indexeddb 于 setup 注入，覆盖 idb 全链路
 * - import.meta.env 由 vitest 原生提供（VITE_* 走默认值分支）
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
      exclude: [
        'src/__tests__/**',
        'src/**/*.d.ts',
        // 纯类型声明文件（零运行时语句）
        'src/types.ts',
        'src/database/types.ts',
      ],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
