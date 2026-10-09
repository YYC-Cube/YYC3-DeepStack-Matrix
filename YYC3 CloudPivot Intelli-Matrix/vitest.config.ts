import { defineConfig } from "vitest/config";

// Vitest 独立配置
// 说明: 单元测试仅需 jsdom 环境，无需 React/Tailwind 插件，
//       避免 vite 6 与 vitest 内部 vite 5 的 Plugin 类型冲突。
// 参考: https://vitest.dev/config/
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["__tests__/e2e/**", "node_modules", "dist"],
    css: false,
  },
});
