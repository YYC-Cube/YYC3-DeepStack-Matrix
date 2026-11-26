#!/bin/bash
# 第四批:error-handler 链尾巴
set -e
SRC='/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily版/src/app'
T='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant/src'
for f in yyc3-storage figma-error-filter; do
  cp "$SRC/lib/$f.ts" "$T/lib/"
done
echo "第四批完成: $(find "$T" -type f | wc -l | tr -d ' ') 个文件"
