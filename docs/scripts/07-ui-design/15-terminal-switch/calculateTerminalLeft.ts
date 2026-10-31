// 根据布局模式计算终端左边距
function calculateTerminalLeft(
  layoutMode: LayoutMode,
  windowWidth: number
): number {
  if (layoutMode === 'edit') {
    // 编辑模式：终端在右栏（左栏25% + 中栏45% = 70%）
    return windowWidth * 0.7;
  } else {
    // 预览模式：终端在合并区域（左栏25%）
    return windowWidth * 0.25;
  }
}
