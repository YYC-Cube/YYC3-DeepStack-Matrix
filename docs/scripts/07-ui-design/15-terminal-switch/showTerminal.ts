// 显示终端
function showTerminal(state: TerminalState): TerminalState {
  return {
    ...state,
    terminalVisible: true
  };
}

// 隐藏终端
function hideTerminal(state: TerminalState): TerminalState {
  return {
    ...state,
    terminalVisible: false
  };
}

// 切换终端显示状态
function toggleTerminal(state: TerminalState): TerminalState {
  return {
    ...state,
    terminalVisible: !state.terminalVisible
  };
}
