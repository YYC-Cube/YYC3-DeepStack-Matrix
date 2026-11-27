#!/bin/bash
# FAmily/public 全量覆盖拷入(Owner 指令:完全复制,覆盖当前 public)
# 字体目录(fonts)为本地化产物,不在 FAmily/public 内,不受影响
set -e
P='/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/YYC3-CloudPivot-Intelli-Matrix-FAmily/public'
A='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant/public'
cp -R "$P/" "$A/"
echo "覆盖完成: $(du -sh "$A" | cut -f1)"
# 关键引用核验
for f in yyc3-icons/macOS/64.png placeholder-logo.png yyc3-matrix.png; do
  [ -f "$A/$f" ] && echo "✓ $f" || echo "✗ 缺 $f"
done
