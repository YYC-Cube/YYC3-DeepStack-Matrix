/**
 * @file: tsup.config.ts
 * @description: @yyc3-deepstack/store 构建配置 — cjs+esm+dts 三格式，src 全量 glob 多入口（exports 子路径 1:1 映射 dist）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @updated: 2026-11-27
 * @status: active
 * @tags: [store],[build],[tsup]
 *
 * @brief: 24 子路径导出逐条映射 dist 产物（对齐家族先例 packages/family-core tsup 形制）
 *
 * @details:
 * - entry = src 全量 glob：dist 内目录结构与 src 保持一致
 * - peerDeps(react/zustand/immer/sonner) 与 dep(@yyc3-deepstack/core) 默认 external
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: true,
  target: 'es2022',
  outDir: 'dist',
});
