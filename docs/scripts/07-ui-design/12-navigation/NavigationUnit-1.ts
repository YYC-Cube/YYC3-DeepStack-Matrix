interface NavigationUnit {
  // 唯一标识
  id: string;
  
  // 导航类型
  type: 'main' | 'sub' | 'tab';
  
  // 显示信息
  label: string;
  icon?: string;
  badge?: number;
  
  // 路由信息
  path?: string;
  external?: boolean;
  
  // 子导航
  children?: NavigationUnit[];
  
  // 状态
  active: boolean;
  expanded: boolean;
  disabled: boolean;
  
  // 权限
  permission?: string[];
  
  // 配置
  config?: {
    closable?: boolean;
    draggable?: boolean;
    pinned?: boolean;
    maxTabs?: number;
  };
}
