// 设置页面用户交互接口
interface SettingsUserInteraction {
  // 搜索交互
  search: {
    query: string;
    results: SettingItem[];
    onSearch: (query: string) => void;
    onSelect: (item: SettingItem) => void;
  };
  
  // 表单交互
  forms: {
    account: AccountForm;
    general: GeneralForm;
    model: ModelForm;
    conversation: ConversationForm;
    skills: SkillsForm;
  };
  
  // 快捷操作
  quickActions: {
    save: () => void;
    reset: () => void;
    import: () => void;
    export: () => void;
  };
}
