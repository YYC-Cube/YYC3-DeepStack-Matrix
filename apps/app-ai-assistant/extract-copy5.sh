#!/bin/bash
# 第五批:AI Family 七图示页套件(来源 = ai-assistant-dev 已验证抽取版)
# ai-family 33 组件 + 音乐/语音/情感 lib 链 + 情感 hooks + 音乐资源
set -e
SRC='/Volumes/Max/YYC3-CloudPivot-Intelli-Matrix-多版本/ai-assistant-dev/src'
T='/Users/yanyu/YYC-Cube/personal/YYC3-DeepStack-Matrix/apps/app-ai-assistant/src'

cp -R "$SRC/components/ai-family" "$T/components/"

for f in MusicEventBus VoiceCommandParser VoiceProfileManager SmartPlaylistGenerator LyricsGenerator FamilyMusicThemes EmotionMusicBridge dmusic-resources canvasPerfRegistry AchievementSystem MultimodalEmotionEngine; do
  cp "$SRC/lib/$f.ts" "$T/lib/" 2>/dev/null || echo "缺 lib $f"
done

for f in useEmotionMusic useAudioEngine useMusicPlayer; do
  cp "$SRC/hooks/$f.ts" "$T/hooks/" 2>/dev/null || echo "缺 hook $f"
done

echo "第五批完成: $(find "$T" -type f | wc -l | tr -d ' ') 个文件"
