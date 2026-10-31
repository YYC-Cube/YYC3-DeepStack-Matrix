import React, { useState, useEffect, useRef } from 'react';

type LayoutMode = 'edit' | 'preview';

interface TerminalState {
  layoutMode: LayoutMode;
  terminalVisible: boolean;
  terminalHeight: number;
}

const SmartTerminal: React.FC = () => {
  const [state, setState] = useState<TerminalState>({
    layoutMode: 'edit',
    terminalVisible: false,
    terminalHeight: 200
  });

  const panelRef = useRef<HTMLDivElement>(null);

  // 计算终端宽度
  const getTerminalWidth = (): number => {
    const windowWidth = window.innerWidth;
    return calculateTerminalWidth(state.layoutMode, windowWidth);
  };

  // 计算终端左边距
  const getTerminalLeft = (): number => {
    const windowWidth = window.innerWidth;
    return calculateTerminalLeft(state.layoutMode, windowWidth);
  };

  // 切换布局模式
  const handleModeSwitch = (mode: LayoutMode) => {
    setState(prev => 
      mode === 'edit' 
        ? switchToEditMode(prev)
        : switchToPreviewMode(prev)
    );
  };

  // 切换终端显示
  const handleTerminalToggle = () => {
    setState(prev => toggleTerminal(prev));
  };

  // 关闭终端
  const handleTerminalClose = () => {
    setState(prev => hideTerminal(prev));
  };

  // 拖拽调整高度
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      setState(prev => adjustTerminalHeight(prev, newHeight));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + ` 切换终端
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        handleTerminalToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 窗口大小变化时重新计算
  useEffect(() => {
    const handleResize = () => {
      // 触发重新渲染以更新终端宽度
      setState(prev => ({ ...prev }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [state.layoutMode]);

  const terminalWidth = getTerminalWidth();
  const terminalLeft = getTerminalLeft();

  return (
    <div className="layout-container">
      {/* 左栏 */}
      <aside className="left-column">
        {/* AI对话面板 */}
        {/* 用户输入框 */}
      </aside>

      {/* 中栏和右栏容器 */}
      <div className="main-columns">
        {state.layoutMode === 'edit' ? (
          // 编辑模式：中栏和右栏独立
          <>
            <main className="middle-column">
              {/* 文件资源管理器 */}
              {/* 集成终端 */}
            </main>
            <aside className="right-column">
              {/* 代码编辑器 */}
              <button onClick={handleTerminalToggle}>
                终端切换
              </button>
            </aside>
          </>
        ) : (
          // 预览模式：中栏和右栏合并
          <main className="merged-column">
            {/* 文件预览/编辑器 */}
            <button onClick={handleTerminalToggle}>
              终端切换
            </button>
          </main>
        )}

        {/* 智能终端面板 */}
        {state.terminalVisible && (
          <div
            ref={panelRef}
            className="terminal-panel"
            style={{
              width: `${terminalWidth}px`,
              height: `${state.terminalHeight}px`,
              left: `${terminalLeft}px`
            }}
          >
            {/* 终端标题栏 */}
            <div className="terminal-header">
              <span>终端</span>
              <button onClick={handleTerminalClose}>
                关闭
              </button>
            </div>

            {/* 拖拽调整手柄 */}
            <div
              className="resize-handle"
              onMouseDown={handleMouseDown}
            />

            {/* 终端内容 */}
            <div className="terminal-content">
              {/* 命令行内容 */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartTerminal;
