// Figma API接口定义
interface FigmaAPI {
  // 文件访问
  getFile: (fileKey: string) => Promise<FigmaFile>;
  getNode: (fileKey: string, nodeId: string) => Promise<FigmaNode>;

  // 设计解析
  parseDesign: (file: FigmaFile) => Promise<DesignJSON>;
  extractDesignSystem: (file: FigmaFile) => Promise<DesignSystem>;

  // 实时同步
  subscribeToFileChanges: (fileKey: string, callback: (change: FileChange) => void) => () => void;
  subscribeToNodeChanges: (fileKey: string, nodeId: string, callback: (change: NodeChange) => void) => () => void;
}

// Figma文件接口
interface FigmaFile {
  document: FigmaDocument;
  components: Record<string, FigmaComponent>;
  styles: Record<string, FigmaStyle>;
  schemaVersion: number;
}

// 设计JSON接口
interface DesignJSON {
  id: string;
  name: string;
  type: 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'COMPONENT' | 'INSTANCE' | 'RECTANGLE' | 'TEXT';
  children?: DesignJSON[];
  properties: DesignProperties;
  styles: DesignStyles;
  layout: DesignLayout;
  interactions: DesignInteraction[];
}

// 设计属性接口
interface DesignProperties {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  rotation?: number;
  opacity?: number;
  cornerRadius?: number;
  fills?: Fill[];
  strokes?: Stroke[];
  effects?: Effect[];
}

// 设计样式接口
interface DesignStyles {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
}

// 设计布局接口
interface DesignLayout {
  layoutMode?: 'NONE' | 'VERTICAL' | 'HORIZONTAL';
  itemSpacing?: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };
}

// 设计交互接口
interface DesignInteraction {
  trigger: 'ON_CLICK' | 'ON_HOVER' | 'ON_PRESS' | 'ON_DRAG';
  action: 'NAVIGATE' | 'OPEN_OVERLAY' | 'SWAP' | 'ANIMATE';
  target?: string;
  animation?: {
    duration: number;
    easing: 'EASE_IN' | 'EASE_OUT' | 'EASE_IN_OUT' | 'LINEAR';
  };
}
