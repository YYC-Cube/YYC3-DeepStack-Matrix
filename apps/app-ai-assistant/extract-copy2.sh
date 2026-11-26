#!/bin/bash
# app-ai-assistant 第二批:stores/lib 补齐(纯复制)
set -e
SRC='/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily版/src/app'
T='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant/src'
mkdir -p "$T/stores"
cp "$SRC/stores/dashboard-stores.ts" "$T/stores/"
cp "$SRC/lib/create-local-store.ts" "$T/lib/" 2>/dev/null || echo "缺 create-local-store"
cp "$SRC/lib/api-config.ts" "$T/lib/"
cp "$SRC/lib/view-context.ts" "$T/lib/"
echo "第二批完成: $(find "$T" -type f | wc -l | tr -d ' ') 个文件"
