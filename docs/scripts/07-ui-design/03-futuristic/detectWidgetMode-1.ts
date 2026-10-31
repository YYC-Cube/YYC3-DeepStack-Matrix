// 模式检测工具
export const detectWidgetMode = (): 'standalone' | 'widget' => {
  // 检查是否在iframe中
  if (window.self !== window.top) {
    return 'widget';
  }

  // 检查URL参数
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  if (mode === 'widget') {
    return 'widget';
  }

  // 检查localStorage
  const savedMode = localStorage.getItem('yyc3-mode');
  if (savedMode) {
    return savedMode as 'standalone' | 'widget';
  }

  // 默认为独立应用模式
  return 'standalone';
};

// 模式切换Hook
export const useWidgetMode = () => {
  const [mode, setMode] = useState<'standalone' | 'widget'>(detectWidgetMode());

  const switchMode = (newMode: 'standalone' | 'widget') => {
    setMode(newMode);
    localStorage.setItem('yyc3-mode', newMode);
  };

  return { mode, switchMode };
};
