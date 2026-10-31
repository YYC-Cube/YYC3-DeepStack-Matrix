interface NavigationState {
  // 主导航
  mainNav: NavigationUnit[];
  activeMainNav: string;
  
  // 子导航
  subNav: NavigationUnit[];
  activeSubNav: string;
  
  // Tab导航
  tabs: ClosableTab[];
  activeTab: string;
  
  // 导航历史
  history: string[];
  historyIndex: number;
}
