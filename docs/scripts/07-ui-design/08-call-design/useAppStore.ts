import { create } from 'zustand';

interface AppState {
  // 用户状态
  user: User | null;
  setUser: (user: User | null) => void;
  
  // 导航状态
  navigation: NavigationState;
  setNavigation: (nav: NavigationState) => void;
  
  // 数据状态
  data: DataState;
  setData: (data: DataState) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  navigation: {
    mainNav: [],
    subNav: [],
    tabs: [],
    activeTab: '',
  },
  setNavigation: (navigation) => set({ navigation }),
  
  data: {
    customers: [],
    recommendations: [],
    analytics: {},
  },
  setData: (data) => set({ data }),
}));
