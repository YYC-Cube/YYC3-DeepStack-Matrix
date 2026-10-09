/**
 * ide-settings-slice.ts
 * =====================
 * IDE 设置全局状态 (zustand)
 *
 * 管理:
 * - 编辑器设置 (IDESettings): 主题/字体/字号/自动保存等
 * - 布局模式 (IDELayoutMode): edit | preview | free
 * - 布局配置 (LayoutConfig): 面板布局持久化
 *
 * 通过 zustand persist 中间件自动持久化到 localStorage
 * (key: yyc3_ide_settings)。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayoutConfig } from "../../components/ide/ide-layout-types";
import type { IDELayoutMode, IDESettings } from "../../components/ide/ide-types";

// ============================================================
// 默认值
// ============================================================

const DEFAULT_SETTINGS: IDESettings = {
  theme: "cyberpunk",
  fontSize: 13,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
  tabSize: 2,
  wordWrap: false,
  minimap: true,
  lineNumbers: true,
  autoSave: true,
  autoSaveDelay: 1000,
  formatOnSave: false,
  bracketPairColorization: true,
};

// ============================================================
// Store 状态类型
// ============================================================

interface IDESettingsState {
  settings: IDESettings;
  layoutMode: IDELayoutMode;
  layoutConfig: LayoutConfig | null;

  setLayoutMode: (mode: IDELayoutMode) => void;
  updateSetting: <K extends keyof IDESettings>(key: K, value: IDESettings[K]) => void;
  resetSettings: () => void;
  setLayoutConfig: (config: LayoutConfig | null) => void;
}

// ============================================================
// Store 实现
// ============================================================

export const useIDESettingsSlice = create<IDESettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      layoutMode: "edit",
      layoutConfig: null,

      setLayoutMode: (mode) => set({ layoutMode: mode }),

      updateSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      setLayoutConfig: (config) => set({ layoutConfig: config }),
    }),
    {
      name: "yyc3_ide_settings",
    },
  ),
);
