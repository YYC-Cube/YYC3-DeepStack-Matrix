#!/bin/bash
# app-ai-assistant 抽取拷贝清单(纯复制,来源 FAmily版 src/app 已审计文件)
set -e
SRC='/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily版/src/app'
T='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant/src'

mkdir -p "$T/components/ui" "$T/hooks" "$T/lib" "$T/i18n" "$T/types" "$T/styles"

# ── 全局 UI/UX 套件(49 件) + 玻璃卡 ──
cp -R "$SRC/components/ui" "$T/components/"
cp "$SRC/components/GlassCard.tsx" "$T/components/"

# ── 页面与浮窗 ──
for f in Login AIAssistant ModelProviderPanel AddModelModal ProviderEditorModal SystemSettings NetworkConfig BottomNav YYC3Logo YYC3LogoSvg; do
  cp "$SRC/components/$f.tsx" "$T/components/"
done

# ── hooks ──
for f in useI18n useModelProvider useSettingsStore useNetworkConfig useResponsive; do
  cp "$SRC/hooks/$f.ts" "$T/hooks/" 2>/dev/null || echo "缺 hook $f"
done

# ── lib ──
for f in broadcast-channel ollama-url; do
  cp "$SRC/lib/$f.ts" "$T/lib/" 2>/dev/null || echo "缺 lib $f"
done

# ── i18n / types / styles ──
cp "$SRC/i18n/index.ts" "$SRC/i18n/zh-CN.ts" "$SRC/i18n/en-US.ts" "$T/i18n/"
cp "$SRC/types/index.ts" "$T/types/"
cp "$V_PLACEHOLDER" 2>/dev/null || true
cp '/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily版/src/styles/index.css' "$T/styles/"
cp '/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily版/src/styles/tailwind.css' "$T/styles/"
cp '/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily版/src/styles/theme.css' "$T/styles/"
cp '/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily版/src/styles/fonts.css' "$T/styles/"

echo "拷贝完成: $(find "$T" -type f | wc -l | tr -d ' ') 个文件, $(du -sh "$T" | cut -f1)"
