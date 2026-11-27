/**
 * @file: exports-surface.test.ts
 * @description: @yyc3/ide 导出面冒烟 — package.json 全部 38 子路径逐一 import 断言（dist 三格式存在性 + 自引用解析 + 非空导出）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 *
 * @brief: 本测试验证「exports 声明 ↔ dist 产物」一致性，须先 `pnpm build` 再 `pnpm test`
 *（prepublishOnly 顺序已保证；单独跑 test 而 dist 缺失时给出明确指引）
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf-8')) as {
  name: string;
  exports: Record<string, Record<string, string>>;
};

const NAME = pkg.name;
// 全部子路径（排除 "./package.json" 元条目）
const SUBPATHS = Object.keys(pkg.exports).filter((k) => k !== './package.json');
// 无 css/DOM 副作用图的纯逻辑子路径 — 附加 cjs require 条件断言
const CJS_SAFE = new Set([
  `${NAME}/ide-types`,
  `${NAME}/ide-layout-types`,
  `${NAME}/ide-mock-data`,
  `${NAME}/ide-settings-slice`,
  `${NAME}/theme/color-utils`,
  `${NAME}/theme/theme-presets`,
  `${NAME}/xterm-integration`,
  `${NAME}/hooks/use-terminal`,
]);
// 纯类型子路径（编译后运行时命名空间合法为空，仅断言解析/加载成功）
const TYPE_ONLY = new Set([`${NAME}/ide-types`, `${NAME}/ide-layout-types`]);

describe('@yyc3/ide 导出面冒烟（38 子路径 × 三条件）', () => {
  it('exports 恰为 38 条子路径 + ./package.json 元条目', () => {
    expect(SUBPATHS).toHaveLength(38);
    expect(pkg.exports['./package.json']).toBe('./package.json');
  });

  it('每条子路径的 types/import/require 目标文件全部存在', () => {
    for (const [key, conds] of Object.entries(pkg.exports)) {
      if (key === './package.json') { continue; }
      for (const [cond, target] of Object.entries(conds)) {
        const abs = join(pkgDir, target.replace(/^\.\//, ''));
        expect(
          { subpath: key, cond, target, exists: existsSync(abs) },
          `${key} [${cond}] → ${target} 不存在（先跑 pnpm build）`,
        ).toEqual({ subpath: key, cond, target, exists: true });
      }
    }
  });

  it.each(SUBPATHS)('esm import "%s" 经 exports 解析成功且导出非空', async (subpath) => {
    const spec = subpath === '.' ? NAME : `${NAME}${subpath.slice(1)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ns: Record<string, any> = await import(/* @vite-ignore */ spec);
    if (!TYPE_ONLY.has(spec)) {
      expect(Object.keys(ns).length, `${spec} 导出为空`).toBeGreaterThan(0);
    }
  });

  it.each([...CJS_SAFE])('cjs require "%s" 加载成功且导出非空', (spec) => {
    const req = createRequire(join(pkgDir, 'package.json'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: Record<string, any> = req(spec);
    if (!TYPE_ONLY.has(spec)) {
      expect(Object.keys(mod).length, `${spec} cjs 导出为空`).toBeGreaterThan(0);
    }
  });
});
