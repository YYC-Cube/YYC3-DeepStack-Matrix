import { create } from 'zustand';

interface NavigationStore {
  state: NavigationState;
  
  // 主导航操作
  setActiveMainNav: (id: string) => void;
  toggleMainNav: (id: string) => void;
  
  // 子导航操作
  setActiveSubNav: (id: string) => void;
  toggleSubNav: (id: string) => void;
  
  // Tab操作
  setActiveTab: (id: string) => void;
  addTab: (tab: ClosableTab) => void;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  
  // 历史操作
  goBack: () => void;
  goForward: () => void;
  navigateTo: (path: string) => void;
}

const useNavigationStore = create<NavigationStore>((set, get) => ({
  state: {
    mainNav: [],
    activeMainNav: '',
    subNav: [],
    activeSubNav: '',
    tabs: [],
    activeTab: '',
    history: [],
    historyIndex: -1,
  },
  
  setActiveMainNav: (id) => set((state) => ({
    state: {
      ...state.state,
      activeMainNav: id,
      subNav: state.state.mainNav.find(n => n.id === id)?.children || [],
      activeSubNav: '',
    }
  })),
  
  setActiveSubNav: (id) => set((state) => ({
    state: {
      ...state.state,
      activeSubNav: id,
    }
  })),
  
  setActiveTab: (id) => set((state) => ({
    state: {
      ...state.state,
      activeTab: id,
    }
  })),
  
  addTab: (tab) => set((state) => {
    const existingTab = state.state.tabs.find(t => t.id === tab.id);
    if (existingTab) {
      return {
        state: {
          ...state.state,
          activeTab: tab.id,
        }
      };
    }
    
    const newTabs = [...state.state.tabs, tab];
    return {
      state: {
        ...state.state,
        tabs: newTabs,
        activeTab: tab.id,
      }
    };
  }),
  
  closeTab: (id) => set((state) => {
    const newTabs = state.state.tabs.filter(t => t.id !== id);
    const activeIndex = state.state.tabs.findIndex(t => t.id === id);
    const newActiveTab = activeIndex === state.state.tabs.length - 1
      ? newTabs[newTabs.length - 1]?.id || ''
      : state.state.activeTab;
    
    return {
      state: {
        ...state.state,
        tabs: newTabs,
        activeTab: newActiveTab,
      }
    };
  }),
  
  closeOtherTabs: (id) => set((state) => ({
    state: {
      ...state.state,
      tabs: state.state.tabs.filter(t => t.id === id || t.pinned),
      activeTab: id,
    }
  })),
  
  closeAllTabs: () => set((state) => ({
    state: {
      ...state.state,
      tabs: state.state.tabs.filter(t => t.pinned),
      activeTab: '',
    }
  })),
  
  goBack: () => set((state) => {
    const newIndex = state.state.historyIndex - 1;
    if (newIndex >= 0) {
      return {
        state: {
          ...state.state,
          historyIndex: newIndex,
        }
      };
    }
    return state;
  }),
  
  goForward: () => set((state) => {
    const newIndex = state.state.historyIndex + 1;
    if (newIndex < state.state.history.length) {
      return {
        state: {
          ...state.state,
          historyIndex: newIndex,
        }
      };
    }
    return state;
  }),
  
  navigateTo: (path) => set((state) => {
    const newHistory = state.state.history.slice(0, state.state.historyIndex + 1);
    newHistory.push(path);
    
    return {
      state: {
        ...state.state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    };
  }),
}));
