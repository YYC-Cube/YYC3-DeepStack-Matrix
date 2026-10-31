interface WidgetSizeConfig {
  small: { width: number; height: number };
  medium: { width: number; height: number };
  large: { width: number; height: number };
  custom: { width: number; height: number };
}

const widgetSizes: WidgetSizeConfig = {
  small: { width: 320, height: 480 },
  medium: { width: 480, height: 640 },
  large: { width: 640, height: 800 },
  custom: { width: 0, height: 0 },
};
