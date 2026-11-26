#!/bin/bash
# 第七批:项目原有 public 品牌资源实体拷入(自包含;截图目录为审计资料不拷)
set -e
P='/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/public'
A='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant/public'
cp -R "$P/yyc3-logo-cyan" "$A/"
cp -R "$P/yyc3-icons" "$A/"
cp "$P/yyc3-matrix.png" "$P/yyc3-family.png" "$A/"
echo "资源拷入: $(du -sh "$A" | cut -f1)"
ls "$A"
