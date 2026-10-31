// utils/soundEffects.ts (与首页共享)
export const soundEffects = new SoundEffectsManager();

// 在设置页面中使用
import { soundEffects } from './utils/soundEffects';

// 播放音效
soundEffects.play('hover');
soundEffects.play('click');
soundEffects.play('confirm');
