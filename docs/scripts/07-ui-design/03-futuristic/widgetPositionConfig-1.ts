type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'custom';

interface WidgetPositionConfig {
  default: WidgetPosition;
  custom?: { x: number; y: number };
  enableDrag: boolean;
  enableResize: boolean;
}

const widgetPositionConfig: WidgetPositionConfig = {
  default: 'bottom-right',
  enableDrag: true,
  enableResize: true,
};
