// 布局模式类型
type LayoutMode = 'edit' | 'preview';

// 终端状态接口
interface TerminalState {
  layoutMode: LayoutMode;        // 当前布局模式
  terminalVisible: boolean;       // 终端是否可见
  terminalHeight: number;         // 终端高度
}

// 初始状态
const initialState: TerminalState = {
  layoutMode: 'edit',
  terminalVisible: false,
  terminalHeight: 200
};
