// components/settings/SearchBar.tsx
import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { soundEffects } from '../../utils/soundEffects';

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  
  // 搜索逻辑
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    
    const allSettings = getAllSettings();
    const filtered = allSettings.filter(setting =>
      setting.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query]);
  
  const handleFocus = () => {
    setIsFocused(true);
    soundEffects.play('hover');
  };
  
  const handleBlur = () => {
    setIsFocused(false);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };
  
  return (
    <div className="settings__search">
      <div className={`settings__search-input ${isFocused ? 'focused' : ''}`}>
        <span className="settings__search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索设置..."
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
      {results.length > 0 && (
        <div className="settings__search-results">
          {results.map((result, index) => (
            <div key={index} className="settings__search-result">
              {result}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function getAllSettings(): string[] {
  return [
    '账号信息',
    '主题设置',
    '语言设置',
    '编辑器设置',
    '快捷键设置',
    '模型配置',
    '智能体管理',
    'MCP连接',
    '代码索引',
    '对话流设置',
    '规则和技能',
    // 更多设置项...
  ];
}
