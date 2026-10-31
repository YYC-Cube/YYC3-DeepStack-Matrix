// 状态转换规则
const stateTransitions = {
  // 从编辑模式切换到预览模式
  'edit->preview': (state: TerminalState) => ({
    ...state,
    layoutMode: 'preview'
  }),

  // 从预览模式切换到编辑模式
  'preview->edit': (state: TerminalState) => ({
    ...state,
    layoutMode: 'edit'
  }),

  // 显示终端
  'hidden->visible': (state: TerminalState) => ({
    ...state,
    terminalVisible: true
  }),

  // 隐藏终端
  'visible->hidden': (state: TerminalState) => ({
    ...state,
    terminalVisible: false
  })
};

// 应用状态转换
function applyTransition(
  state: TerminalState,
  transition: string
): TerminalState {
  const transitionFn = stateTransitions[transition as keyof typeof stateTransitions];
  return transitionFn ? transitionFn(state) : state;
}
