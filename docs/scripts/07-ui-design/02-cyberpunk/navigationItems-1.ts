interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  active?: boolean;
  neonColor?: string;
}

const navigationItems: NavigationItem[] = [
  { 
    id: 'chat', 
    label: '聊天', 
    icon: 'MessageCircle', 
    path: '/chat', 
    active: true,
    neonColor: '#00f0ff'
  },
  { 
    id: 'tools', 
    label: '工具', 
    icon: 'Tool', 
    path: '/tools', 
    badge: 3,
    neonColor: '#ff00ff'
  },
  { 
    id: 'workflow', 
    label: '工作流', 
    icon: 'Workflow', 
    path: '/workflow',
    neonColor: '#ffff00'
  },
  { 
    id: 'insights', 
    label: '洞察', 
    icon: 'BarChart3', 
    path: '/insights',
    neonColor: '#00ff00'
  },
  { 
    id: 'settings', 
    label: '设置', 
    icon: 'Settings', 
    path: '/settings',
    neonColor: '#ff0000'
  },
];
