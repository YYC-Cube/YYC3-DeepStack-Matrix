#!/bin/bash
# 第三批:依赖链尾巴(network-utils/config-validator/error-handler/env-config)
set -e
SRC='/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily版/src/app'
T='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant/src'
for f in network-utils config-validator error-handler env-config; do
  cp "$SRC/lib/$f.ts" "$T/lib/"
done
echo "第三批完成: $(find "$T" -type f | wc -l | tr -d ' ') 个文件"
