// components/settings/ModelSettings.tsx
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { soundEffects } from '../../utils/soundEffects';

export const ModelSettings: React.FC = () => {
  const { state, dispatch } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  
  const providers = [
    { value: 'zhipu', label: '智谱GLM', url: 'https://open.bigmodel.cn/usercenter/apikeys' },
    { value: 'openai', label: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
    { value: 'anthropic', label: 'Anthropic', url: 'https://console.anthropic.com/' },
  ];
  
  const models = {
    zhipu: ['glm-4', 'glm-4-0520', 'glm-3-turbo'],
    openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  };
  
  const handleProviderChange = (provider: string) => {
    dispatch({ 
      type: 'SET_MODEL', 
      payload: { provider, model: models[provider as keyof typeof models][0] } 
    });
    soundEffects.play('click');
  };
  
  const handleModelChange = (model: string) => {
    dispatch({ type: 'SET_MODEL', payload: { model } });
    soundEffects.play('click');
  };
  
  const handleApiKeyChange = (apiKey: string) => {
    dispatch({ type: 'SET_MODEL', payload: { apiKey } });
  };
  
  const currentProvider = providers.find(p => p.value === state.model.provider);
  
  return (
    <div className="settings__section">
      <h2 className="settings__section-title">模型</h2>
      <div className="settings__section-content">
        <div className="settings__form-group">
          <label>服务商</label>
          <select
            value={state.model.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            {providers.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="settings__form-group">
          <label>模型</label>
          <select
            value={state.model.model}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            {models[state.model.provider as keyof typeof models]?.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
        
        <div className="settings__form-group">
          <label>API密钥</label>
          <div className="settings__api-key-input">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={state.model.apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="输入API密钥"
            />
            <button
              className="settings__toggle-visibility"
              onClick={() => {
                setShowApiKey(!showApiKey);
                soundEffects.play('click');
              }}
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
            {currentProvider && (
              <a
                href={currentProvider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="settings__get-api-key"
                onClick={() => soundEffects.play('click')}
              >
                获取API密钥
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
