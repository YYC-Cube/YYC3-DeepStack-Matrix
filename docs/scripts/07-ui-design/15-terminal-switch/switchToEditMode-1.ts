const switchToEditMode = () => {
  setLayoutMode({
    mode: 'edit',
    terminalVisible: layoutMode.terminalVisible,
    terminalWidth: window.innerWidth * 0.3 // 30% 宽度
  });
};

const switchToPreviewMode = () => {
  setLayoutMode({
    mode: 'preview',
    terminalVisible: layoutMode.terminalVisible,
    terminalWidth: window.innerWidth * 0.75 // 75% 宽度
  });
};
