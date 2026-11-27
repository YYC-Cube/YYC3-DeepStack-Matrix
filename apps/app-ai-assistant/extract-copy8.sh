#!/bin/bash
# 第八批:可增复用五件套全链(AI 决策/AI 诊断/配置中心/用户管理/⌘K 命令面板)
set -e
SRC='/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily版/src/app'
T='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant/src'
mkdir -p "$T/config"

for f in AISuggestionPanel AIDiagnostics ConfigCenter UserManagement CommandPalette PatternAnalyzer ActionRecommender SDKChatPanel PageConfigEditor DesignSystemEditor; do
  cp "$SRC/components/$f.tsx" "$T/components/"
done

for f in useAISuggestion useAIDiagnostics useKeyboardShortcuts usePageConfig useBigModelSDK useDesignSystem usePersistedState; do
  cp "$SRC/hooks/$f.ts" "$T/hooks/" 2>/dev/null || echo "缺 hook $f"
done

cp "$SRC/config/index.ts" "$SRC/config/page-config.ts" "$SRC/config/variable-center.ts" "$SRC/config/design-system.ts" "$T/config/" 2>/dev/null || cp "$SRC/config/"*.ts "$T/config/"

echo "第八批完成: $(find "$T" -type f | wc -l | tr -d ' ') 个文件"
