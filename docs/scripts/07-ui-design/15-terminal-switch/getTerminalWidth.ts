const getTerminalWidth = () => {
  const windowWidth = window.innerWidth;
  const leftColumnWidth = windowWidth * 0.25; // 25%

  if (layoutMode.mode === 'edit') {
    // 编辑模式：右栏宽度（30%）
    return windowWidth * 0.3;
  } else {
    // 预览模式：合并区域宽度（75%）
    return windowWidth - leftColumnWidth;
  }
};
