interface ClosableTab {
  id: string;
  label: string;
  icon?: string;
  closable: boolean;
  pinned?: boolean;
  modified?: boolean;
}

const handleCloseTab = (tabId: string) => {
  if (tabs.find(t => t.id === tabId)?.pinned) {
    return; // 固定Tab不可关闭
  }
  setTabs(tabs.filter(t => t.id !== tabId));
};
