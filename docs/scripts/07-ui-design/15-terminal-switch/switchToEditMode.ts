// 切换到编辑模式
function switchToEditMode(state: TerminalState): TerminalState {
  return {
    ...state,
    layoutMode: 'edit',
    // 保持终端显示状态不变
    // 终端宽度自动调整
  };
}

// 切换到预览模式
function switchToPreviewMode(state: TerminalState): TerminalState {
  return {
    ...state,
    layoutMode: 'preview',
    // 保持终端显示状态不变
    // 终端宽度自动调整
  };
}
