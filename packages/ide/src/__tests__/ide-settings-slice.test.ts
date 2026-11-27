/**
 * @file: ide-settings-slice.test.ts
 * @description: ide-settings-slice 逻辑用例 — Zustand 设置切片（persist/localStorage + legacy 三键迁移）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useIDESettingsSlice,
  DEFAULT_IDE_SETTINGS,
  migrateLegacyIDESettings,
} from '../ide-settings-slice';

const slice = () => useIDESettingsSlice.getState();

describe('ide-settings-slice 默认态与操作', () => {
  beforeEach(() => {
    localStorage.clear();
    slice().resetSettings();
    slice().setLayoutConfig(null as never);
  });

  it('DEFAULT_IDE_SETTINGS 与切片初始 settings 一致', () => {
    expect(slice().settings).toEqual(DEFAULT_IDE_SETTINGS);
    expect(DEFAULT_IDE_SETTINGS.fontSize).toBe(14);
    expect(DEFAULT_IDE_SETTINGS.wordWrap).toBe(true);
    expect(DEFAULT_IDE_SETTINGS.autoSaveDelay).toBe(1000);
  });

  it('setLayoutMode 切换布局模式', () => {
    expect(slice().layoutMode).toBe('preview');
    slice().setLayoutMode('edit');
    expect(slice().layoutMode).toBe('edit');
    slice().setLayoutMode('free');
    expect(slice().layoutMode).toBe('free');
  });

  it('updateSetting 单键合并不破坏其余键', () => {
    slice().updateSetting('fontSize', 16);
    const s = slice().settings;
    expect(s.fontSize).toBe(16);
    expect(s.theme).toBe(DEFAULT_IDE_SETTINGS.theme);
    expect(s.tabSize).toBe(DEFAULT_IDE_SETTINGS.tabSize);
  });

  it('setSettings 整体替换 settings 对象', () => {
    const replaced = { ...DEFAULT_IDE_SETTINGS, fontSize: 22, minimap: false, theme: 'light' as const };
    slice().setSettings(replaced);
    expect(slice().settings).toEqual(replaced);
    expect(slice().settings).not.toBe(DEFAULT_IDE_SETTINGS);
    slice().resetSettings();
    expect(slice().settings).toEqual(DEFAULT_IDE_SETTINGS);
  });

  it('resetSettings 回滚到默认值', () => {
    slice().updateSetting('wordWrap', false);
    slice().updateSetting('minimap', false);
    expect(slice().settings.wordWrap).toBe(false);
    slice().resetSettings();
    expect(slice().settings).toEqual(DEFAULT_IDE_SETTINGS);
  });

  it('setLayoutConfig 存取布局配置', () => {
    expect(slice().layoutConfig).toBeNull();
    const cfg = { panes: [{ id: 'p1', width: 300 }] } as never;
    slice().setLayoutConfig(cfg);
    expect(slice().layoutConfig).toEqual(cfg);
  });

  it('persist 中间件将切片写入 localStorage（yyc3-ide）', async () => {
    slice().setLayoutMode('edit');
    await vi.waitFor(() => {
      const raw = localStorage.getItem('yyc3-ide');
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw as string).state.layoutMode).toBe('edit');
    });
  });
});

describe('migrateLegacyIDESettings 三键 legacy 迁移', () => {
  beforeEach(() => {
    localStorage.clear();
    slice().resetSettings();
    slice().setLayoutMode('preview');
    slice().setLayoutConfig(null as never);
  });

  it('三个 legacy 键全部迁入切片并从 localStorage 移除', () => {
    localStorage.setItem('yyc3-ide-layout-mode', 'free');
    localStorage.setItem('yyc3-ide-settings', JSON.stringify({ fontSize: 20, theme: 'light' }));
    localStorage.setItem('ide-layout', JSON.stringify({ panes: [] }));

    const migrated = migrateLegacyIDESettings();

    expect(migrated).toBe(true);
    expect(slice().layoutMode).toBe('free');
    expect(slice().settings.fontSize).toBe(20);
    expect(slice().settings.theme).toBe('light');
    // merge 语义：legacy 缺省键回落 DEFAULT
    expect(slice().settings.wordWrap).toBe(DEFAULT_IDE_SETTINGS.wordWrap);
    expect(slice().layoutConfig).toEqual({ panes: [] });
    expect(localStorage.getItem('yyc3-ide-layout-mode')).toBeNull();
    expect(localStorage.getItem('yyc3-ide-settings')).toBeNull();
    expect(localStorage.getItem('ide-layout')).toBeNull();
  });

  it('非法 layoutMode 值被忽略，不污染切片', () => {
    localStorage.setItem('yyc3-ide-layout-mode', 'bogus');
    migrateLegacyIDESettings();
    expect(slice().layoutMode).toBe('preview');
  });

  it('无 legacy 键时返回 false 且不改动状态', () => {
    expect(migrateLegacyIDESettings()).toBe(false);
    expect(slice().settings).toEqual(DEFAULT_IDE_SETTINGS);
  });
});
