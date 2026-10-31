// 组件性能监控工具
class ComponentPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  record(componentName: string, renderTime: number) {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, []);
    }
    this.metrics.get(componentName)!.push(renderTime);
  }

  getAverage(componentName: string): number {
    const times = this.metrics.get(componentName) || [];
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getSlowComponents(threshold: number = 100): string[] {
    const slowComponents: string[] = [];
    for (const [name, times] of this.metrics.entries()) {
      const avg = this.getAverage(name);
      if (avg > threshold) {
        slowComponents.push(name);
      }
    }
    return slowComponents;
  }
}
