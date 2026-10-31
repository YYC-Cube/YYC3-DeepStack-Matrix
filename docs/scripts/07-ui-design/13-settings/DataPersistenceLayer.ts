// 数据持久层接口
interface DataPersistenceLayer {
  // 设置存储
  settings: {
    save: (config: SettingsConfig) => Promise<void>;
    load: () => Promise<SettingsConfig>;
    delete: () => Promise<void>;
  };
  
  // Design JSON存储（与设计画布协同）
  design: {
    save: (design: DesignJSON) => Promise<void>;
    load: (projectId: string) => Promise<DesignJSON>;
    list: () => Promise<DesignJSON[]>;
  };
  
  // 代码仓库存储（与代码生成协同）
  code: {
    save: (code: GeneratedCode) => Promise<void>;
    load: (codeId: string) => Promise<GeneratedCode>;
    list: () => Promise<GeneratedCode[]>;
  };
  
  // 用户数据存储
  user: {
    save: (user: UserData) => Promise<void>;
    load: (userId: string) => Promise<UserData>;
    update: (userId: string, updates: Partial<UserData>) => Promise<void>;
  };
}

// 用户数据接口
interface UserData {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  preferences: SettingsConfig;
  projects: Project[];
  createdAt: number;
  updatedAt: number;
}
