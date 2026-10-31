// 在所有设置组件中使用
import { soundEffects } from '../../utils/soundEffects';

// 悬停音效
const handleHover = () => {
  soundEffects.play('hover');
};

// 点击音效
const handleClick = () => {
  soundEffects.play('click');
};

// 确认音效
const handleConfirm = () => {
  soundEffects.play('confirm');
};

// 取消音效
const handleCancel = () => {
  soundEffects.play('dismiss');
};

// 设置保存音效
const handleSave = () => {
  soundEffects.playSettings('save');
};

// 设置重置音效
const handleReset = () => {
  soundEffects.playSettings('reset');
};
