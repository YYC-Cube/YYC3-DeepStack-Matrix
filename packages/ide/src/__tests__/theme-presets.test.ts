/**
 * @file: theme-presets.test.ts
 * @description: theme/theme-presets 数据完整性用例 — 6 预设唯一性/色彩格式/默认常量形状
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COLORS,
  THEME_PRESETS,
  DEFAULT_TYPOGRAPHY,
  DEFAULT_SHADOW,
  DEFAULT_BRANDING,
} from '../theme/theme-presets';

const HEX = /^#[0-9a-fA-F]{6}$/;
const COLOR_KEYS = Object.keys(DEFAULT_COLORS) as (keyof typeof DEFAULT_COLORS)[];

describe('theme-presets 默认常量', () => {
  it('DEFAULT_COLORS 33 色槽全部为合法 hex', () => {
    expect(COLOR_KEYS.length).toBe(33);
    for (const key of COLOR_KEYS) {
      expect(DEFAULT_COLORS[key], `${key} 非法 hex: ${DEFAULT_COLORS[key]}`).toMatch(HEX);
    }
  });

  it('DEFAULT_TYPOGRAPHY / DEFAULT_SHADOW / DEFAULT_BRANDING 形状', () => {
    expect(DEFAULT_TYPOGRAPHY.mono).toContain('JetBrains Mono');
    expect(DEFAULT_TYPOGRAPHY.sansSerif).toContain('system-ui');
    expect(DEFAULT_SHADOW.color).toMatch(/^#[0-9a-fA-F]{8}$/);
    expect(DEFAULT_BRANDING.systemName).toContain('YYC³');
    expect(typeof DEFAULT_BRANDING.tagline).toBe('string');
  });
});

describe('THEME_PRESETS 预设集合', () => {
  it('恰好 6 个预设且 id/name 唯一', () => {
    expect(THEME_PRESETS).toHaveLength(6);
    const ids = THEME_PRESETS.map((p) => p.id);
    const names = THEME_PRESETS.map((p) => p.name);
    expect(new Set(ids).size).toBe(6);
    expect(new Set(names).size).toBe(6);
    expect(ids).toContain('base');
    expect(ids).toContain('cyberpunk');
  });

  it('每个预设含中英双名与完整 33 色槽（格式合法）', () => {
    for (const preset of THEME_PRESETS) {
      expect(preset.nameEn.length).toBeGreaterThan(0);
      expect(preset.name.length).toBeGreaterThan(0);
      for (const key of COLOR_KEYS) {
        expect(preset.colors[key], `${preset.id}.${key} 缺失或非法`).toMatch(HEX);
      }
    }
  });

  it('预设间色彩存在差异（非同一套色复制）', () => {
    const primaries = new Set(THEME_PRESETS.map((p) => p.colors.primary));
    expect(primaries.size).toBeGreaterThan(2);
  });
});
