// contexts/SettingsContext.tsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { SettingsState } from '../types/settings';

type SettingsAction =
  | { type: 'SET_THEME'; payload: 'dark' | 'light' | 'auto' }
  | { type: 'SET_LANGUAGE'; payload: 'zh-CN' | 'en-US' | 'ja-JP' }
  | { type: 'SET_MODEL'; payload: Partial<SettingsState['model']> }
  | { type: 'SET_CONVERSATION'; payload: Partial<SettingsState['conversation']> }
  | { type: 'SET_RULES'; payload: Partial<SettingsState['rules']> }
  | { type: 'ADD_SKILL'; payload: Skill }
  | { type: 'REMOVE_SKILL'; payload: string }
  | { type: 'UPDATE_SKILL'; payload: Skill }
  | { type: 'LOAD_SETTINGS'; payload: SettingsState }
  | { type: 'RESET_SETTINGS' };

const initialState: SettingsState = {
  theme: 'dark',
  language: 'zh-CN',
  editor: {
    fontSize: 14,
    wordWrap: true,
    windowBehavior: 'restore',
  },
  model: {
    provider: 'zhipu',
    model: 'glm-4',
    apiKey: '',
  },
  conversation: {
    todoList: true,
    autoCollapse: true,
    autoFix: true,
    proactiveQuestion: true,
    codeReview: 'all',
    autoRunMCP: true,
    commandExecution: 'sandbox',
    notification: {
      banner: true,
      sound: true,
      menu: true,
      volume: 0.5,
      sounds: {
        complete: 'default',
        waiting: 'default',
        interrupt: 'default',
      },
    },
  },
  rules: {
    importAgents: true,
    importClaude: true,
    personalRules: [],
    projectRules: [],
  },
  skills: {
    global: [],
    project: [],
  },
};

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_MODEL':
      return { ...state, model: { ...state.model, ...action.payload } };
    case 'SET_CONVERSATION':
      return { 
        ...state, 
        conversation: { ...state.conversation, ...action.payload } 
      };
    case 'SET_RULES':
      return { ...state, rules: { ...state.rules, ...action.payload } };
    case 'ADD_SKILL':
      return {
        ...state,
        skills: {
          ...state.skills,
          [action.payload.type]: [...state.skills[action.payload.type], action.payload],
        },
      };
    case 'REMOVE_SKILL':
      return {
        ...state,
        skills: {
          global: state.skills.global.filter(s => s.id !== action.payload),
          project: state.skills.project.filter(s => s.id !== action.payload),
        },
      };
    case 'UPDATE_SKILL':
      return {
        ...state,
        skills: {
          global: state.skills.global.map(s => 
            s.id === action.payload.id ? action.payload : s
          ),
          project: state.skills.project.map(s => 
            s.id === action.payload.id ? action.payload : s
          ),
        },
      };
    case 'LOAD_SETTINGS':
      return action.payload;
    case 'RESET_SETTINGS':
      return initialState;
    default:
      return state;
  }
}

const SettingsContext = createContext<{
  state: SettingsState;
  dispatch: React.Dispatch<SettingsAction>;
} | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  
  // 持久化设置
  React.useEffect(() => {
    localStorage.setItem('yyc3-settings', JSON.stringify(state));
  }, [state]);
  
  // 加载保存的设置
  React.useEffect(() => {
    const saved = localStorage.getItem('yyc3-settings');
    if (saved) {
      try {
        dispatch({ type: 'LOAD_SETTINGS', payload: JSON.parse(saved) });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);
  
  return (
    <SettingsContext.Provider value={{ state, dispatch }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
