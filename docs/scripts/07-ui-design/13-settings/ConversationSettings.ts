// 对话流设置组件实现
import { useSettings } from '@/contexts/SettingsContext';
import { useAI } from '@/contexts/AIContext';
import { SettingIcons } from '@/constants/icons';

export const ConversationSettings: React.FC = () => {
  const { state, dispatch } = useSettings();
  const { updateAIConfig } = useAI();
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  
  // 对话流配置变更
  const handleConversationChange = (key: keyof typeof state.conversation, value: any) => {
    dispatch({ 
      type: 'SET_CONVERSATION', 
      payload: { 
        [key]: value 
      } 
    });
    
    // 同步到AI智能层
    updateAIConfig({
      conversation: {
        ...state.conversation,
        [key]: value,
      },
    });
    
    soundEffects.play('click');
  };
  
  // 通知方式变更
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
  
  // 音量变更
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
    
    // 更新全局音效系统
    soundEffects.setMasterVolume(volume);
  };
  
  // 提示音变更
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
  
  // 试听提示音
  const handlePlaySound = (soundType: keyof typeof state.conversation.notification.sounds) => {
    setPlayingSound(soundType);
    
    // 播放对应的提示音
    switch (soundType) {
      case 'complete':
        soundEffects.play('confirm');
        break;
      case 'waiting':
        soundEffects.play('typing');
        break;
      case 'interrupt':
        soundEffects.play('dismiss');
        break;
    }
    
    setTimeout(() => setPlayingSound(null), 2000);
  };
  
  return (
    <div className="settings__section">
      <h2 className="settings__section-title">
        <LucideIcon name={SettingIcons.conversation} size={24} />
        对话流
      </h2>
      <div className="settings__section-content">
        {/* 待办清单 */}
        <div className="settings__toggle-group">
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={state.conversation.todoList}
              onChange={(e) => handleConversationChange('todoList', e.target.checked)}
            />
            <span>待办清单</span>
            <span className="settings__toggle-description">
              使用待办清单跟踪任务进度
            </span>
          </label>
          
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={state.conversation.autoCollapse}
              onChange={(e) => handleConversationChange('autoCollapse', e.target.checked)}
            />
            <span>对话流节点自动折叠</span>
            <span className="settings__toggle-description">
              完成任务的对话节点自动折叠并生成摘要
            </span>
          </label>
          
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={state.conversation.autoFix}
              onChange={(e) => handleConversationChange('autoFix', e.target.checked)}
            />
            <span>自动修复代码规范问题</span>
            <span className="settings__toggle-description">
              自动修复对话中检测到的代码问题
            </span>
          </label>
          
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={state.conversation.proactiveQuestion}
              onChange={(e) => handleConversationChange('proactiveQuestion', e.target.checked)}
            />
            <span>智能体主动提问</span>
            <span className="settings__toggle-description">
              智能体在任务不明确时主动提问
            </span>
          </label>
        </div>
        
        {/* 代码审查 */}
        <div className="settings__form-group">
          <label>代码审查</label>
          <div className="settings__select-group">
            <select
              value={state.conversation.codeReview}
              onChange={(e) => handleConversationChange('codeReview', e.target.value)}
            >
              <option value="none">无需审查</option>
              <option value="all">审查全部</option>
              <option value="changed">仅审查变更</option>
            </select>
          </div>
        </div>
        
        {/* 自动运行 */}
        <div className="settings__form-group">
          <label>自动运行</label>
          <div className="settings__toggle-group">
            <label className="settings__toggle">
              <input
                type="checkbox"
                checked={state.conversation.autoRunMCP}
                onChange={(e) => handleConversationChange('autoRunMCP', e.target.checked)}
              />
              <span>自动运行MCP</span>
              <span className="settings__toggle-description">
                使用智能体时自动运行MCP工具
              </span>
            </label>
          </div>
          
          <div className="settings__select-group">
            <label>命令运行方式</label>
            <select
              value={state.conversation.commandExecution}
              onChange={(e) => handleConversationChange('commandExecution', e.target.value)}
            >
              <option value="sandbox">沙箱运行（支持白名单）</option>
              <option value="direct">直接执行</option>
            </select>
          </div>
        </div>
        
        {/* 任务状态通知 */}
        <div className="settings__form-group">
          <label>任务状态通知</label>
          <div className="settings__notification-settings">
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
            
            <div className="settings__volume-control">
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
                    className={`settings__play-sound ${playingSound === key ? 'playing' : ''}`}
                    onClick={() => handlePlaySound(key as any)}
                    disabled={playingSound !== null}
                  >
                    <LucideIcon 
                      name={playingSound === key ? SettingIcons.stop : SettingIcons.play} 
                      size={16} 
                    />
                    {playingSound === key ? '播放中' : '试听'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
