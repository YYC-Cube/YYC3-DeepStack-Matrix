// components/settings/LanguageSelector.tsx
import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { soundEffects } from '../../utils/soundEffects';

export const LanguageSelector: React.FC = () => {
  const { state, dispatch } = useSettings();
  
  const languages = [
    { value: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
    { value: 'en-US', label: 'English', flag: '🇺🇸' },
    { value: 'ja-JP', label: '日本語', flag: '🇯🇵' },
  ];
  
  const handleLanguageChange = (language: 'zh-CN' | 'en-US' | 'ja-JP') => {
    dispatch({ type: 'SET_LANGUAGE', payload: language });
    soundEffects.play('click');
  };
  
  return (
    <div className="settings__language-selector">
      <select
        value={state.language}
        onChange={(e) => handleLanguageChange(e.target.value as any)}
      >
        {languages.map((language) => (
          <option key={language.value} value={language.value}>
            {language.flag} {language.label}
          </option>
        ))}
      </select>
    </div>
  );
};
