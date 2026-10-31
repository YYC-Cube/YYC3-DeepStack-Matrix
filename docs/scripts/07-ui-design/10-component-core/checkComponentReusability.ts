// 组件可复用性检查工具
const checkComponentReusability = (component) => {
  const checks = {
    // 检查1：是否支持多种配置
    supportsMultipleConfigs: component.hasVariants,

    // 检查2：是否适用于不同场景
    worksInDifferentContexts: component.contextAgnostic,

    // 检查3：是否有清晰文档
    hasDocumentation: component.hasDocs,

    // 检查4：是否遵循设计规范
    followsDesignSystem: component.isStandardized,

    // 检查5：是否被多次使用
    usedMultipleTimes: component.usageCount >= 2
  };

  const score = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;

  return {
    checks,
    score,
    isReusable: score >= 0.6
  };
};
