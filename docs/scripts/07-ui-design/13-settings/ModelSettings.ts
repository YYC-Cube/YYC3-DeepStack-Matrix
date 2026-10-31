// 模型配置组件实现
import { useSettings } from '@/contexts/SettingsContext';
import { useAI } from '@/contexts/AIContext';
import { SettingIcons } from '@/constants/icons';

export const ModelSettings: React.FC = () => {
  const { state, dispatch } = useSettings();
  const { switchModel, testConnection } = useAI();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  
  const providers = [
    { 
      value: 'zhipu', 
      label: '智谱GLM', 
      labelEn: 'Zhipu GLM',
      url: 'https://open.bigmodel.cn/usercenter/apikeys',
      models: ['glm-4', 'glm-4-0520', 'glm-3-turbo'],
    },
    { 
      value: 'openai', 
      label: 'OpenAI', 
      labelEn: 'OpenAI',
      url: 'https://platform.openai.com/api-keys',
      models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    },
    { 
      value: 'anthropic', 
      label: 'Anthropic', 
      labelEn: 'Anthropic',
      url: 'https://console.anthropic.com/',
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    },
  ];
  
  const currentProvider = providers.find(p => p.value === state.model.provider);
  const availableModels = currentProvider?.models || [];
  
  // 服务商切换
  const handleProviderChange = async (provider: string) => {
    const newProvider = providers.find(p => p.value === provider);
    if (newProvider) {
      dispatch({ 
        type: 'SET_MODEL', 
        payload: { 
          provider, 
          model: newProvider.models[0],
        } 
      });
      soundEffects.play('click');
      
      // 切换到AI智能层
      await switchModel(provider, newProvider.models[0]);
    }
  };
  
  // 模型切换
  const handleModelChange = async (model: string) => {
    dispatch({ type: 'SET_MODEL', payload: { model } });
    soundEffects.play('click');
    
    // 切换到AI智能层
    await switchModel(state.model.provider, model);
  };
  
  // API密钥变更
  const handleApiKeyChange = (apiKey: string) => {
    dispatch({ type: 'SET_MODEL', payload: { apiKey } });
  };
  
  // 测试连接
  const handleTestConnection = async () => {
    if (!state.model.apiKey) {
      setTestResult({
        success: false,
        message: '请先输入API密钥',
      });
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection({
        provider: state.model.provider,
        model: state.model.model,
        apiKey: state.model.apiKey,
      });
      
      setTestResult({
        success: result.success,
        message: result.success ? '连接成功！' : '连接失败：' + result.error,
      });
      
      soundEffects.play(result.success ? 'confirm' : 'error');
    } catch (error) {
      setTestResult({
        success: false,
        message: '连接测试失败：' + (error as Error).message,
      });
      soundEffects.play('error');
    } finally {
      setIsTesting(false);
    }
  };
  
  return (
    <div className="settings__section">
      <h2 className="settings__section-title">
        <LucideIcon name={SettingIcons.model} size={24} />
        模型
      </h2>
      <div className="settings__section-content">
        <div className="settings__form-group">
          <label>服务商</label>
          <select
            value={state.model.provider}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            {providers.map((provider) => (
              <option key={provider.value} value={provider.value}>
                {provider.label} ({provider.labelEn})
              </option>
            ))}
          </select>
        </div>
        
        <div className="settings__form-group">
          <label>模型</label>
          <select
            value={state.model.model}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={!state.model.provider}
          >
            {availableModels.map((model) => (
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
              <LucideIcon 
                name={showApiKey ? 'EyeOff' : 'Eye'} 
                size={16} 
              />
            </button>
            {currentProvider && (
              <a
                href={currentProvider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="settings__get-api-key"
                onClick={() => soundEffects.play('click')}
              >
                <LucideIcon name={SettingIcons.browser} size={16} />
                获取API密钥
              </a>
            )}
          </div>
        </div>
        
        <div className="settings__form-group">
          <label>测试连接</label>
          <button
            className={`settings__button ${isTesting ? 'loading' : ''}`}
            onClick={handleTestConnection}
            disabled={isTesting || !state.model.apiKey}
          >
            {isTesting ? (
              <>
                <LucideIcon name={SettingIcons.loading} size={16} />
                测试中...
              </>
            ) : (
              <>
                <LucideIcon name={SettingIcons.play} size={16} />
                测试连接
              </>
            )}
          </button>
        </div>
        
        {testResult && (
          <div className={`settings__test-result ${testResult.success ? 'success' : 'error'}`}>
            <LucideIcon 
              name={testResult.success ? SettingIcons.success : SettingIcons.error} 
              size={20} 
            />
            <span>{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
