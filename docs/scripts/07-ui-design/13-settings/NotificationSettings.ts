// components/settings/NotificationSettings.tsx
import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { soundEffects } from '../../utils/soundEffects';

export const NotificationSettings: React.FC = () => {
  const { state, dispatch } = useSettings();
  
  const handleNotificationChange = (key: keyof typeof state.conversation.notification, value: any) => {
    dispatch({ 
      type: 'SET_CONVERSATION', 
      payload: { 
        notification: { 
          ...state.conversation.notification, 
          [key]: value 
        } 
      } 
    });
    soundEffects.play('click');
  };
  
  const handleSoundChange = (soundType: keyof typeof state.conversation.notification.sounds, soundName: string) => {
    dispatch({ 
      type: 'SET_CONVERSATION', 
      payload: { 
        notification: { 
          ...state.conversation.notification, 
          sounds: { 
            ...state.conversation.notification.sounds, 
            [soundType]: soundName 
          } 
        } 
      } 
    });
    soundEffects.play('click');
  };
  
  const handleVolumeChange = (volume: number) => {
    dispatch({ 
      type: 'SET_CONVERSATION', 
      payload: { 
        notification: { 
          ...state.conversation.notification, 
          volume 
        } 
      } 
    });
    soundEffects.setMasterVolume(volume);
  };
  
  const playTestSound = (soundType: keyof typeof state.conversation.notification.sounds) => {
    soundEffects.playNotification(soundType);
  };
  
  return (
    <div className="settings__section">
      <h2 className="settings__section-title">任务状态通知</h2>
      <div className="settings__section-content">
        <div className="settings__toggle-group">
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={state.conversation.notification.banner}
              onChange={(e) => handleNotificationChange('banner', e.target.checked)}
            />
            <span>横幅通知</span>
          </label>
          
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={state.conversation.notification.sound}
              onChange={(e) => handleNotificationChange('sound', e.target.checked)}
            />
            <span>声音通知</span>
          </label>
          
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={state.conversation.notification.menu}
              onChange={(e) => handleNotificationChange('menu', e.target.checked)}
            />
            <span>菜单栏通知</span>
          </label>
        </div>
        
        <div className="settings__form-group">
          <label>音量</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={state.conversation.notification.volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          />
          <span className="settings__volume-value">
            {Math.round(state.conversation.notification.volume * 100)}%
          </span>
        </div>
        
        <div className="settings__sound-selector">
          <label>提示音</label>
          {Object.entries(state.conversation.notification.sounds).map(([key, value]) => (
            <div key={key} className="settings__sound-option">
              <span className="settings__sound-label">
                {key === 'complete' ? '任务完成' : key === 'waiting' ? '等待操作' : '异常打断'}
              </span>
              <select
                value={value}
                onChange={(e) => handleSoundChange(key as any, e.target.value)}
              >
                <option value="default">默认</option>
                <option value="gentle">柔和</option>
                <option value="energetic">活力</option>
                <option value="minimal">极简</option>
              </select>
              <button
                className="settings__play-sound"
                onClick={() => playTestSound(key as any)}
              >
                ▶️ 试听
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
