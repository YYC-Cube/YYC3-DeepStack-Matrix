// 调整终端高度
function adjustTerminalHeight(
  state: TerminalState,
  newHeight: number
): TerminalState {
  // 限制高度范围：100px - 400px
  const clampedHeight = Math.max(100, Math.min(400, newHeight));
  
  return {
    ...state,
    terminalHeight: clampedHeight
  };
}
