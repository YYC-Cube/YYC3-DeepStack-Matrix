#!/bin/bash
# 字体本地化:下载 Google Fonts woff2 全量 → public/fonts,css 重写为本地引用
# (一次性供给;此后应用运行时零外链字体拉取)
set -e
A='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant'
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

i=0
while read -r url; do
  i=$((i+1))
  case "$url" in
    *orbitron*) name="orbitron-$i.woff2" ;;
    *rajdhani*) name="rajdhani-$i.woff2" ;;
    *) name="font-$i.woff2" ;;
  esac
  curl -s "$url" -o "$A/public/fonts/$name"
  # css 内该 url 替换为本地路径(按出现顺序逐一替换)
  python3 - <<PYEOF
import re
p = '/tmp/gf.css'
s = open(p).read()
s = s.replace('$url', '/fonts/$name', 1)
open(p, 'w').write(s)
PYEOF
done < <(grep -oE 'https://fonts.gstatic.com/[^)]+' /tmp/gf.css | sort -u)

cp /tmp/gf.css "$A/src/styles/fonts-local.css"
remaining=$(grep -c 'fonts.gstatic.com' "$A/src/styles/fonts-local.css" || true)
echo "本地化完成: $i 个 woff2,css 残留外链 $remaining"
ls "$A/public/fonts" | head -5
