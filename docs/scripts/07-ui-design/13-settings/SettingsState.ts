// types/settings.ts
export interface SettingsState {
  // 通用设置
  theme: 'dark' | 'light' | 'auto';
  language: 'zh-CN' | 'en-US' | 'ja-JP';
  editor: {
    fontSize: number;
    wordWrap: boolean;
    windowBehavior: 'restore' | 'maximize';
  };
  
  // 模型设置
  model: {
    provider: string;
    model: string;
    apiKey: string;
  };
  
  // 对话流设置
  conversation: {
    todoList: boolean;
    autoCollapse: boolean;
    autoFix: boolean;
    proactiveQuestion: boolean;
    codeReview: 'none' | 'all' | 'changed';
    autoRunMCP: boolean;
    commandExecution: 'sandbox' | 'direct';
    notification: {
      banner: boolean;
      sound: boolean;
      menu: boolean;
      volume: number;
      sounds: {
        complete: string;
        waiting: string;
        interrupt: string;
      };
    };
  };
  
  // 规则和技能
  rules: {
    importAgents: boolean;
    importClaude: boolean;
    personalRules: string[];
    projectRules: string[];
  };
  
  skills: {
    global: Skill[];
    project: Skill[];
  };
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'global' | 'project';
  content: string;
  createdAt: number;
  updatedAt: number;
}
