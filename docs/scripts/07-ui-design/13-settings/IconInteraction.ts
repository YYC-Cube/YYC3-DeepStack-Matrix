// 图标交互接口
interface IconInteraction {
  // 尺寸规范
  sizes: {
    xs: 16;  // 按钮内、列表项
    s: 20;   // 工具栏、菜单
    m: 24;   // 导航、状态
    l: 32;   // 功能入口
    xl: 48;   // 欢迎界面、空状态
  };
  
  // 颜色规范
  colors: {
    default: 'currentColor';
    primary: '#6366f1';
    secondary: '#a855f7';
    success: '#10b981';
    warning: '#f59e0b';
    error: '#ef4444';
  };
  
  // 交互状态
  states: {
    default: {
      opacity: 1;
      transform: 'none';
    };
    hover: {
      opacity: 0.8;
      transform: 'scale(1.1)';
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    };
    active: {
      opacity: 1;
      transform: 'scale(1.05)';
      filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.3))';
    };
    disabled: {
      opacity: 0.5;
      cursor: 'not-allowed';
    };
  };
}
