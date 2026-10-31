// components/settings/ThemeSelector.tsx
import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { soundEffects } from '../../utils/soundEffects';

export const ThemeSelector: React.FC = () => {
  const { state, dispatch } = useSettings();
  
  const themes = [
    { value: 'dark', label: '深色', icon: '🌙' },
    { value: 'light', label: '浅色', icon: '☀️' },
    { value: 'auto', label: '跟随系统', icon: '🔄' },
  ];
  
  const handleThemeChange = (theme: 'dark' | 'light' | 'auto') => {
    dispatch({ type: 'SET_THEME', payload: theme });
    soundEffects.play('click');
  };
  
  return (
    <div className="settings__theme-selector">
      {themes.map((theme) => (
        <button
          key={theme.value}
          className={`settings__theme-option ${
            state.theme === theme.value ? 'active' : ''
          }`}
          onClick={() => handleThemeChange(theme.value)}
        >
          <span className="settings__theme-icon">{theme.icon}</span>
          <span className="settings__theme-label">{theme.label}</span>
        </button>
      ))}
    </div>
  );
};
