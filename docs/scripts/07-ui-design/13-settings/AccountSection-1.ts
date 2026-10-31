// components/settings/AccountSection.tsx
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { soundEffects } from '../../utils/soundEffects';

export const AccountSection: React.FC = () => {
  const { state, dispatch } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: state.user?.username || '',
    email: state.user?.email || '',
    avatar: state.user?.avatar || '',
  });
  
  const handleSave = () => {
    dispatch({ 
      type: 'SET_USER', 
      payload: formData 
    });
    setIsEditing(false);
    soundEffects.play('confirm');
  };
  
  const handleCancel = () => {
    setFormData({
      username: state.user?.username || '',
      email: state.user?.email || '',
      avatar: state.user?.avatar || '',
    });
    setIsEditing(false);
    soundEffects.play('dismiss');
  };
  
  return (
    <div className="settings__section">
      <h2 className="settings__section-title">账号</h2>
      <div className="settings__section-content">
        <div className="settings__account-info">
          <div className="settings__avatar">
            {formData.avatar ? (
              <img src={formData.avatar} alt="头像" />
            ) : (
              <div className="settings__avatar-placeholder">
                {formData.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="settings__user-details">
            <div className="settings__username">{formData.username}</div>
            <div className="settings__email">{formData.email}</div>
          </div>
        </div>
        
        {isEditing ? (
          <div className="settings__edit-form">
            <div className="settings__form-group">
              <label>用户名</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="settings__form-group">
              <label>邮箱</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="settings__form-actions">
              <button onClick={handleSave}>保存</button>
              <button onClick={handleCancel}>取消</button>
            </div>
          </div>
        ) : (
          <button 
            className="settings__edit-button"
            onClick={() => {
              setIsEditing(true);
              soundEffects.play('click');
            }}
          >
            编辑资料
          </button>
        )}
      </div>
    </div>
  );
};
