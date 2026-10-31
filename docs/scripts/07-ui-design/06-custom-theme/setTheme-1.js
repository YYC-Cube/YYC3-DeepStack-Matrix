// 切换主题
function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
}

// 获取当前主题
function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme');
}

// 应用自定义主题
function applyCustomTheme(themeConfig) {
  const root = document.documentElement;
  
  // 应用颜色
  Object.entries(themeConfig.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // 应用字体
  Object.entries(themeConfig.fonts).forEach(([key, value]) => {
    root.style.setProperty(`--font-${key}`, value);
  });
  
  // 应用布局
  Object.entries(themeConfig.layout).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
}
