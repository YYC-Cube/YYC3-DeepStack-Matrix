interface SidebarSection {
  title: string;
  items: SidebarItem[];
  glitchEffect?: boolean;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  active?: boolean;
  neonColor?: string;
}

const sidebarSections: SidebarSection[] = [
  {
    title: '主要功能',
    glitchEffect: true,
    items: [
      { 
        id: 'chat', 
        label: 'AI聊天', 
        icon: 'MessageCircle', 
        path: '/chat', 
        active: true,
        neonColor: '#00f0ff'
      },
      { 
        id: 'tools', 
        label: 'AI工具', 
        icon: 'Tool', 
        path: '/tools', 
        badge: 12,
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
        label: '数据洞察', 
        icon: 'BarChart3', 
        path: '/insights',
        neonColor: '#00ff00'
      },
    ],
  },
  {
    title: '个人中心',
    items: [
      { 
        id: 'history', 
        label: '历史记录', 
        icon: 'History', 
        path: '/history',
        neonColor: '#0000ff'
      },
      { 
        id: 'favorites', 
        label: '收藏夹', 
        icon: 'Star', 
        path: '/favorites',
        neonColor: '#ff00ff'
      },
      { 
        id: 'profile', 
        label: '个人资料', 
        icon: 'User', 
        path: '/profile',
        neonColor: '#00f0ff'
      },
    ],
  },
];
