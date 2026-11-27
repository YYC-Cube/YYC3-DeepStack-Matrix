/**
 * @file: tsup.config.ts
 * @description: @yyc3-deepstack/ui 构建配置 — cjs+esm+dts 三格式，src 全量 glob 多入口（通配导出 1:1 映射 dist）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @updated: 2026-11-27
 * @status: active
 * @tags: [ui],[build],[tsup]
 *
 * @brief: 深路径导入（@yyc3-deepstack/ui/button 等）经 exports 通配 "./*" 映射 dist 同构路径
 *
 * @details:
 * - entry = src 全量 glob：dist/button.js 等 1:1 对应 src/button.tsx
 * - brand/ 子目录随 glob 进入 dist/brand/，通配符 "*" 可跨 "/" 匹配
 * - radix/recharts/lucide 等 dependencies 默认 external（tsup 内建），react 同为 peer
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
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
