// utils/soundEffects.ts
import { soundEffects } from './soundEffects';

// 初始化音效系统
soundEffects.initialize();

// 配置音效
soundEffects.setMasterVolume(0.3);
soundEffects.setEnabled(true);

// 使用音效
soundEffects.play('hover');
soundEffects.play('click');
soundEffects.play('messageSend');
