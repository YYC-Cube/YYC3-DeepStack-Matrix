// 代码生成引擎接口
interface CodeGenerator {
  // 组件生成
  generateComponent: (design: DesignJSON) => GeneratedComponent;
  generateComponentWithProps: (design: DesignJSON, props: PropDefinition[]) => GeneratedComponent;

  // 样式生成
  generateStyles: (design: DesignJSON) => GeneratedStyles;
  generateTailwindClasses: (design: DesignJSON) => string;

  // 布局生成
  generateLayout: (design: DesignJSON) => GeneratedLayout;
  generateResponsiveLayout: (design: DesignJSON) => GeneratedLayout;

  // 文档生成
  generateDocumentation: (component: GeneratedComponent) => ComponentDocumentation;
  generateUsageExamples: (component: GeneratedComponent) => UsageExample[];
}

// 生成的组件接口
interface GeneratedComponent {
  name: string;
  code: string;
  types: string;
  props: PropDefinition[];
  dependencies: string[];
  styles: GeneratedStyles;
  layout: GeneratedLayout;
  documentation: ComponentDocumentation;
}

// Props定义接口
interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description: string;
}

// 生成的样式接口
interface GeneratedStyles {
  tailwind: string;
  css: string;
  cssVariables: Record<string, string>;
}

// 生成的布局接口
interface GeneratedLayout {
  desktop: string;
  tablet: string;
  mobile: string;
}

// 组件文档接口
interface ComponentDocumentation {
  description: string;
  props: PropDocumentation[];
  examples: UsageExample[];
  accessibility: AccessibilityInfo;
}

// 使用示例接口
interface UsageExample {
  title: string;
  code: string;
  description: string;
}

// 可访问性信息接口
interface AccessibilityInfo {
  keyboardSupport: boolean;
  screenReaderSupport: boolean;
  colorContrast: {
    normal: boolean;
    large: boolean;
  };
  ariaLabels: string[];
}
