// 组件质量检查脚本
const componentQualityCheck = {
  // 单一职责检查
  checkSingleResponsibility: (component) => {
    return component.functions.length <= 3;
  },
  
  // 可复用性检查
  checkReusability: (component) => {
    return component.usageCount >= 2;
  },
  
  // 依赖检查
  checkDependencies: (component) => {
    return component.dependencies.length <= 5;
  },
  
  // 文档完整性检查
  checkDocumentation: (component) => {
    return component.hasDescription && 
           component.hasExamples && 
           component.hasPropsAPI;
  }
};
