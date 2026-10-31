const saveTabsToStorage = (tabs: ClosableTab[]) => {
  localStorage.setItem('navigation-tabs', JSON.stringify(tabs));
};

const loadTabsFromStorage = (): ClosableTab[] => {
  const saved = localStorage.getItem('navigation-tabs');
  return saved ? JSON.parse(saved) : [];
};
