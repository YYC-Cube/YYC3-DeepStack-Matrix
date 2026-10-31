// 终端宽度计算
function calculateTerminalWidth(
  layoutMode: LayoutMode,
  windowWidth: number
): number {
  const leftColumnWidth = windowWidth * 0.25;
  
  if (layoutMode === 'edit') {
    return windowWidth * 0.3;
  } else {
    return windowWidth - leftColumnWidth;
  }
}

// 终端位置计算
function calculateTerminalLeft(
  layoutMode: LayoutMode,
  windowWidth: number
): number {
  if (layoutMode === 'edit') {
    return windowWidth * 0.7;
  } else {
    return windowWidth * 0.25;
  }
}

// 高度限制
function clampHeight(height: number): number {
  return Math.max(100, Math.min(400, height));
}

// 模式切换
function switchLayoutMode(
  currentMode: LayoutMode
): LayoutMode {
  return currentMode === 'edit' ? 'preview' : 'edit';
}

// 终端状态切换
function toggleTerminalState(visible: boolean): boolean {
  return !visible;
}
