const handleTabShortcuts = (e: KeyboardEvent) => {
  // Ctrl/Cmd + 数字：切换到对应Tab
  if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
    const tabIndex = parseInt(e.key) - 1;
    if (tabIndex < tabs.length) {
      setActiveTab(tabs[tabIndex].id);
    }
  }
  
  // Ctrl/Cmd + W：关闭当前Tab
  if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
    e.preventDefault();
    handleCloseTab(activeTab);
  }
  
  // Ctrl/Cmd + Tab：切换到下一个Tab
  if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
    e.preventDefault();
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTab(tabs[nextIndex].id);
  }
};
