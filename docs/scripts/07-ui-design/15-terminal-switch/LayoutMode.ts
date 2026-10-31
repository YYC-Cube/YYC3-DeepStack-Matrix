interface LayoutMode {
  mode: 'edit' | 'preview';
  terminalVisible: boolean;
  terminalWidth: number;
}

const [layoutMode, setLayoutMode] = useState<LayoutMode>({
  mode: 'edit',           // 当前模式
  terminalVisible: false, // 终端是否显示
  terminalWidth: 0       // 终端宽度（根据模式自动计算）
});
