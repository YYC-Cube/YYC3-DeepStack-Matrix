// 设置管理器接口
interface SettingsManager {
  // 配置管理
  config: SettingsConfig;
  
  // 验证逻辑
  validate: (config: SettingsConfig) => ValidationResult;
  
  // 应用逻辑
  apply: (config: SettingsConfig) => Promise<void>;
  
  // 同步逻辑
  sync: () => Promise<void>;
  
  // 导入导出
  import: (data: string) => Promise<boolean>;
  export: () => Promise<string>;
}

// 设置配置接口（与多联式系统协同）
interface SettingsConfig {
  // 通用设置
  general: {
    theme: 'dark' | 'light' | 'auto';
    language: 'zh-CN' | 'en-US' | 'ja-JP';
    editor: {
      fontSize: number;
      wordWrap: boolean;
      windowBehavior: 'restore' | 'maximize';
    };
    shortcuts: ShortcutConfig;
    importConfig: ImportConfig;
    browser: {
      localLink: 'system' | 'builtin';
      markdownFile: 'editor' | 'other';
    };
    development: {
      nodeVersion: string;
    };
  };
  
  // 模型配置（影响AI智能层）
  model: {
    provider: 'zhipu' | 'openai' | 'anthropic';
    model: string;
    apiKey: string;
    endpoint?: string;
  };
  
  // 智能体配置（影响AI交互区）
  agents: {
    custom: CustomAgent[];
    builtin: BuiltinAgent[];
    activeAgent: string;
  };
  
  // MCP配置（影响功能逻辑层）
  mcp: {
    connections: MCPConnection[];
    projectMCPEnabled: boolean;
    autoLoad: boolean;
  };
  
  // 上下文配置（影响数据持久层）
  context: {
    codeIndex: CodeIndexConfig;
    ignoreFiles: string[];
    documentSets: DocumentSet[];
  };
  
  // 对话流配置（影响AI智能层）
  conversation: {
    todoList: boolean;
    autoCollapse: boolean;
    autoFix: boolean;
    proactiveQuestion: boolean;
    codeReview: 'none' | 'all' | 'changed';
    autoRunMCP: boolean;
    commandExecution: 'sandbox' | 'direct';
    notification: NotificationConfig;
  };
  
  // 规则和技能（影响AI智能层）
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
