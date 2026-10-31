interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  active?: boolean;
}

const navigationItems: NavigationItem[] = [
  { id: 'chat', label: '聊天', icon: 'MessageCircle', path: '/chat', active: true },
  { id: 'tools', label: '工具', icon: 'Tool', path: '/tools', badge: 3 },
  { id: 'workflow', label: '工作流', icon: 'Workflow', path: '/workflow' },
  { id: 'insights', label: '洞察', icon: 'BarChart3', path: '/insights' },
  { id: 'settings', label: '设置', icon: 'Settings', path: '/settings' },
];
