/**
 * @file: color-utils.test.ts
 * @description: theme/color-utils 纯函数逻辑用例 — HEX/RGB/OKLCH/HSV 色彩引擎往返与边界
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  hexToOklch,
  oklchToHex,
  formatOklch,
  parseOklchString,
  hsvToRgb,
  rgbToHsv,
} from '../theme/color-utils';

describe('color-utils HEX/RGB', () => {
  it('hexToRgb 解析标准 6 位 hex', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00d4ff')).toEqual([0, 212, 255]);
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
  });

  it('非法/短输入回退为 0 通道（parseInt NaN || 0 语义）', () => {
    expect(hexToRgb('zzzzzz')).toEqual([0, 0, 0]);
    expect(hexToRgb('#ff')).toEqual([255, 0, 0]);
  });

  it('rgbToHex clamp 到 [0,255] 并补零', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(300, -5, 12.4)).toBe('#ff000c');
  });

  it('rgbToHex ↔ hexToRgb 往返一致', () => {
    for (const [r, g, b] of [[0, 212, 255], [1, 2, 3], [128, 128, 128]] as const) {
      expect(hexToRgb(rgbToHex(r, g, b))).toEqual([r, g, b]);
    }
  });
});

describe('color-utils OKLCH 引擎', () => {
  it('纯色相基准：hex → oklch → hex 往返偏差 ≤ 1/255', () => {
    const samples = ['#ff0000', '#00ff00', '#0000ff', '#00d4ff', '#f5f5f5', '#0a0a0a'];
    for (const hex of samples) {
      const { L, C, h } = hexToOklch(hex);
      expect(L).toBeGreaterThan(0);
      expect(L).toBeLessThanOrEqual(1.0000001);
      expect(C).toBeGreaterThanOrEqual(0);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(360);
      const back = oklchToHex(L, C, h);
      const [r1, g1, b1] = hexToRgb(hex);
      const [r2, g2, b2] = hexToRgb(back);
      expect(Math.abs(r1 - r2)).toBeLessThanOrEqual(1);
      expect(Math.abs(g1 - g2)).toBeLessThanOrEqual(1);
      expect(Math.abs(b1 - b2)).toBeLessThanOrEqual(1);
    }
  });

  it('formatOklch 产出 oklch(L% C h) 字符串', () => {
    const s = formatOklch({ L: 0.5, C: 0.123, h: 200 });
    expect(s).toBe('oklch(50.0% 0.123 200.0)');
    expect(parseOklchString(s)).toEqual({ L: 0.5, C: 0.123, h: 200 });
  });

  it('parseOklchString 接受百分比 L 并归一到 0–1', () => {
    expect(parseOklchString('oklch(75% 0.1 90)')).toEqual({ L: 0.75, C: 0.1, h: 90 });
    expect(parseOklchString('oklch(0.75 0.1 90)')).toEqual({ L: 0.75, C: 0.1, h: 90 });
  });

  it('parseOklchString 对非 oklch 串返回 null', () => {
    expect(parseOklchString('#ff0000')).toBeNull();
    expect(parseOklchString('rgb(1,2,3)')).toBeNull();
    expect(parseOklchString('')).toBeNull();
  });

  it('白色与黑色的 L 端点语义', () => {
    expect(hexToOklch('#ffffff').L).toBeCloseTo(1, 3);
    expect(hexToOklch('#000000').L).toBeCloseTo(0, 3);
  });
});

describe('color-utils HSV（取色器画布）', () => {
  it('hsvToRgb 六段色相环基准', () => {
    expect(hsvToRgb(0, 1, 1)).toEqual([255, 0, 0]);
    expect(hsvToRgb(120, 1, 1)).toEqual([0, 255, 0]);
    expect(hsvToRgb(240, 1, 1)).toEqual([0, 0, 255]);
    expect(hsvToRgb(60, 0, 1)).toEqual([255, 255, 255]); // s=0 → 灰阶
  });

  it('rgbToHsv 基准与 hsvToRgb 往返', () => {
    expect(rgbToHsv(255, 0, 0)).toEqual([0, 1, 1]);
    expect(rgbToHsv(0, 255, 0)).toEqual([120, 1, 1]);
    expect(rgbToHsv(0, 0, 255)).toEqual([240, 1, 1]);
    expect(rgbToHsv(0, 0, 0)).toEqual([0, 0, 0]);
    for (const [h, s, v] of [[30, 0.5, 0.8], [200, 0.9, 1], [310, 0.2, 0.6]] as const) {
      const [r, g, b] = hsvToRgb(h, s, v);
      const [h2, s2, v2] = rgbToHsv(r, g, b);
      expect(Math.abs(h2 - h)).toBeLessThanOrEqual(1);
      expect(Math.abs(s2 - s)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(v2 - v)).toBeLessThanOrEqual(0.01);
    }
  });
});
