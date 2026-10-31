// 组件独立性检查工具
const checkComponentIndependence = (component) => {
  const checks = {
    // 检查1：是否依赖全局状态
    noGlobalState: !component.usesGlobalStore,

    // 检查2：是否依赖外部上下文
    noExternalContext: !component.usesExternalContext,

    // 检查3：是否自包含所有逻辑
    selfContained: component.hasAllLogicInternal,

    // 检查4：是否可以独立测试
    independentlyTestable: component.canBeTestedAlone,

    // 检查5：是否通过 Props 接收依赖
    propsBasedDependencies: component.usesPropsForDependencies
  };

  const score = Object.values(checks).filter(Boolean).length / Object.keys(checks).length;

  return {
    checks,
    score,
    isIndependent: score >= 0.8
  };
};
