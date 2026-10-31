class WidgetPluginManager {
  private mode: 'widget' = 'widget';
  private modules: CoreModules;
  private widgetManager: WidgetManager;
  private hostIntegration: HostIntegration;
  
  constructor() {
    this.modules = this.initializeModules();
    this.widgetManager = new WidgetManager();
    this.hostIntegration = new HostIntegration();
  }
  
  async initialize() {
    // 初始化核心模块（轻量级）
    await this.modules.analysis.initialize();
    await this.modules.execution.initialize();
    await this.modules.optimization.initialize();
    
    // 初始化浮窗
    this.widgetManager.initialize({
      position: 'bottom-right',
      size: 'medium',
      enableDrag: true,
      enableResize: true,
      autoHide: false,
      neonIntensity: 'medium',
      glitchEffect: false
    });
    
    // 集成到宿主应用
    await this.hostIntegration.integrate();
    
    // 启动性能监控
    this.modules.optimization.monitorPerformance();
  }
  
  async handleUserInput(input: UserInput) {
    // 快速分析用户输入
    const analysis = await this.modules.analysis.analyzeInput(input);
    
    // 执行任务（优化响应速度）
    const result = await this.modules.execution.executeTask({
      intent: analysis.intent,
      entities: analysis.entities,
      context: analysis.context,
      priority: 'high'
    });
    
    // 优化性能（浮窗模式优先级更高）
    this.modules.optimization.optimizePerformance({
      priority: 'high',
      mode: 'widget'
    });
    
    // 学习用户行为
    this.modules.learning.learnFromFeedback({
      input,
      result,
      timestamp: Date.now(),
      mode: 'widget'
    });
    
    return result;
  }
  
  toggleWidget() {
    this.widgetManager.toggle();
  }
  
  resizeWidget(size: WidgetSize) {
    this.widgetManager.resize(size);
  }
  
  moveWidget(position: WidgetPosition) {
    this.widgetManager.move(position);
  }
}
