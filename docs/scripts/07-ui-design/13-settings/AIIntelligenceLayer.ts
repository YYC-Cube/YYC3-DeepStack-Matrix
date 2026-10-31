// AI智能层接口（与设置协同）
interface AIIntelligenceLayer {
  // 意图识别（受模型配置影响）
  intentRecognition: {
    recognize: (input: string, context: ConversationContext) => IntentResult;
    confidence: number;
    parameters: Record<string, any>;
  };
  
  // 代码生成（受模型配置影响）
  codeGeneration: {
    generate: (prompt: string, context: CodeContext) => Promise<GeneratedCode>;
    optimize: (code: string) => Promise<OptimizedCode>;
  };
  
  // 错误诊断（受规则和技能影响）
  errorDiagnosis: {
    diagnose: (code: string, rules: Rule[]) => Promise<DiagnosisResult>;
    suggestFix: (error: Error) => Promise<FixSuggestion>;
  };
  
  // 文档生成（受规则和技能影响）
  documentation: {
    generate: (code: string, language: string) => Promise<Documentation>;
    format: 'markdown' | 'html' | 'json';
  };
}

// 对话上下文接口
interface ConversationContext {
  messages: Message[];
  currentProject?: Project;
  activePanel?: string;
  userPreferences: SettingsConfig;
  rules: Rule[];
  skills: Skill[];
}
