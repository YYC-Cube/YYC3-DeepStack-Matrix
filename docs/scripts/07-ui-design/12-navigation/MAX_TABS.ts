const MAX_TABS = 10;

const addTab = (tab: ClosableTab) => {
  const tabs = get().state.tabs;
  if (tabs.length >= MAX_TABS && !tabs.find(t => t.id === tab.id)) {
    // 关闭最旧的Tab
    const oldestTab = tabs.find(t => !t.pinned);
    if (oldestTab) {
      closeTab(oldestTab.id);
    }
  }
  
  set((state) => ({
    state: {
      ...state.state,
      tabs: [...tabs, tab],
      activeTab: tab.id,
    }
  }));
};
