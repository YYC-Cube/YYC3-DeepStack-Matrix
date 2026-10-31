// utils/persistence.ts
export class PersistenceManager {
  private static instance: PersistenceManager;
  
  private constructor() {}
  
  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance) {
      PersistenceManager.instance = new PersistenceManager();
    }
    return PersistenceManager.instance;
  }
  
  // 保存设置
  saveSettings(settings: SettingsState): void {
    localStorage.setItem('yyc3-settings', JSON.stringify(settings));
  }
  
  // 加载设置
  loadSettings(): SettingsState | null {
    const saved = localStorage.getItem('yyc3-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load settings:', error);
        return null;
      }
    }
    return null;
  }
  
  // 保存聊天历史
  saveChatHistory(history: Message[]): void {
    localStorage.setItem('yyc3-chat-history', JSON.stringify(history));
  }
  
  // 加载聊天历史
  loadChatHistory(): Message[] | null {
    const saved = localStorage.getItem('yyc3-chat-history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load chat history:', error);
        return null;
      }
    }
    return null;
  }
  
  // 导出配置
  exportConfig(): string {
    const settings = this.loadSettings();
    return JSON.stringify(settings, null, 2);
  }
  
  // 导入配置
  importConfig(config: string): boolean {
    try {
      const settings = JSON.parse(config);
      this.saveSettings(settings);
      return true;
    } catch (error) {
      console.error('Failed to import config:', error);
      return false;
    }
  }
}

export const persistenceManager = PersistenceManager.getInstance();
