/**
 * @file: tsup.config.ts
 * @description: @yyc3/ide 构建配置 — cjs+esm+dts 三格式，src 全量 glob 多入口（exports 子路径 1:1 映射 dist）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @updated: 2026-11-27
 * @status: active
 * @tags: [ide],[build],[tsup]
 *
 * @brief: 38 子路径导出逐条映射 dist 产物（对齐同仓三包先例 packages/core|store|ui tsup 形制）
 *
 * @details:
 * - entry = src 全量 glob（排除 *.d.ts 环境声明）：dist 内目录结构与 src 保持一致（PascalCase 保留）
 *   package.json exports 逐条把 kebab-case 子路径映射到 dist 同构产物（IDEPanel.tsx → dist/IDEPanel.js）
 * - layout.css 经 Panel.tsx 副作用导入随构建产出 dist css chunk，消费方打包器自动拉取
 * - codemirror/xterm/react 系 21 项 peerDependencies 与 @yyc3-deepstack/* dependencies 默认 external（tsup 内建）
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.d.ts'],
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
