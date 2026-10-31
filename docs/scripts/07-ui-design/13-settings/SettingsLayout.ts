// 设置页面布局接口（与多联式系统协同）
interface SettingsLayout {
  // 布局类型
  type: 'sidebar' | 'modal' | 'drawer';
  
  // 侧边栏配置
  sidebar: {
    width: 240;
    collapsible: true;
    position: 'left' | 'right';
    items: SidebarItem[];
  };
  
  // 主内容区配置
  main: {
    maxWidth: 800;
    padding: 32;
    scrollable: true;
  };
  
  // 响应式断点
  breakpoints: {
    mobile: 768;
    tablet: 1024;
    desktop: 1440;
  };
}

// 侧边栏项接口
interface SidebarItem {
  id: string;
  icon: keyof typeof SettingIcons;
  label: string;
  labelEn: string;
  path: string;
  badge?: number;
  disabled?: boolean;
  children?: SidebarItem[];
}
