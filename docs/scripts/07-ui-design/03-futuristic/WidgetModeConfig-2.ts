// 模式配置接口
interface WidgetModeConfig {
  mode: 'standalone' | 'widget';
  standaloneConfig?: StandaloneConfig;
  widgetConfig?: WidgetConfig;
}

// 独立应用配置
interface StandaloneConfig {
  fullScreen: boolean;
  showNavigation: boolean;
  showSidebar: boolean;
  enableAllModules: boolean;
}

// 浮窗插件配置
interface WidgetConfig {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size: 'small' | 'medium' | 'large' | 'custom';
  enableDrag: boolean;
  enableResize: boolean;
  autoHide: boolean;
}
