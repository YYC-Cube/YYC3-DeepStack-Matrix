interface CyberpunkWidgetConfig {
  // 基础配置
  id: string;
  title: string;
  
  // 尺寸配置
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  
  // 位置配置
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  x: number;
  y: number;
  
  // 状态配置
  minimized: boolean;
  maximized: boolean;
  hidden: boolean;
  
  // 交互配置
  enableDrag: boolean;
  enableResize: boolean;
  autoHide: boolean;
  
  // 赛博朋克风格配置
  neonIntensity: 'low' | 'medium' | 'high';
  glitchEffect: boolean;
  scanlines: boolean;
  circuitGrid: boolean;
  dataFlow: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
}
