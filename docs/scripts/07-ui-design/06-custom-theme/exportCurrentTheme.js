// 导出当前主题
function exportCurrentTheme() {
  const root = document.documentElement;
  const computedStyles = getComputedStyle(root);
  
  const theme = {
    colors: {},
    fonts: {},
    layout: {}
  };
  
  // 获取颜色变量
  document.querySelectorAll('[style*="--color-"]').forEach(el => {
    const style = el.style;
    Object.keys(style).forEach(key => {
      if (key.startsWith('--color-')) {
        theme.colors[key.replace('--color-', '')] = style[key];
      }
    });
  });
  
  return JSON.stringify(theme, null, 2);
}
