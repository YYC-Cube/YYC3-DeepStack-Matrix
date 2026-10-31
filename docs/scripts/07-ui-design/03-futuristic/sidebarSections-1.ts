interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  active?: boolean;
}

const sidebarSections: SidebarSection[] = [
  {
    title: '主要功能',
    items: [
      { id: 'chat', label: 'AI聊天', icon: 'MessageCircle', path: '/chat', active: true },
      { id: 'tools', label: 'AI工具', icon: 'Tool', path: '/tools', badge: 12 },
      { id: 'workflow', label: '工作流', icon: 'Workflow', path: '/workflow' },
      { id: 'insights', label: '数据洞察', icon: 'BarChart3', path: '/insights' },
    ],
  },
  {
    title: '个人中心',
    items: [
      { id: 'history', label: '历史记录', icon: 'History', path: '/history' },
      { id: 'favorites', label: '收藏夹', icon: 'Star', path: '/favorites' },
      { id: 'profile', label: '个人资料', icon: 'User', path: '/profile' },
    ],
  },
];
