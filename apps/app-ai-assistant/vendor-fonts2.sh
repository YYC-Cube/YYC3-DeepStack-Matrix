#!/bin/bash
# 字体本地化 v2:以 gstatic basename 为唯一名下载,css 引用同步改名(零错位)
set -e
A='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant'
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
rm -f "$A"/public/fonts/*.woff2
curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700;800;900&display=swap' -o /tmp/gf2.css
i=0
for url in $(grep -oE 'https://fonts\.gstatic\.com/[^)]+' /tmp/gf2.css | sort -u); do
  i=$((i+1))
  base=$(basename "$url")
  curl -s "$url" -o "$A/public/fonts/$base"
done
python3 - <<'PYEOF'
s = open('/tmp/gf2.css').read()
s = s.replace('https://fonts.gstatic.com/s/', '/fonts/')
open('/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant/src/styles/fonts-local.css', 'w').write(s)
print('css 残留外链:', s.count('fonts.gstatic.com'))
PYEOF
# 校验:css 引用与文件一一对应
miss=0
for r in $(grep -oE '/fonts/[A-Za-z0-9._-]+\.woff2' "$A/src/styles/fonts-local.css" | sort -u); do
  [ -f "$A/public$r" ] || { echo "缺 $r"; miss=1; }
done
[ "$miss" = "0" ] && echo "✅ 全部引用就位($(ls "$A/public/fonts" | wc -l | tr -d ' ') 文件)"
