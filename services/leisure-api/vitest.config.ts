import { defineConfig } from 'vitest/config'

// e2e 共享 dev DB 与包厢/艺人状态:文件必须串行,避免房态互踩
// (testTimeout 30s:覆盖扫码/结算等链路;CI 同参数)
export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 30_000,
  },
})
