/**
 * @file: setup.ts
 * @description: ide 测试 setup — jsdom 环境兜底（xterm/canvas/尺寸测量类 API）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import '@testing-library/jest-dom/vitest';

// jsdom 无 matchMedia（IDE 布局响应式断点需要）
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ResizeObserver 兜底（面板尺寸测量 / xterm fit addon）
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    callback: (entries: unknown[]) => void;
    constructor(cb: (entries: unknown[]) => void) {
      this.callback = cb;
    }
    observe() {
      setTimeout(() => {
        this.callback([
          {
            contentRect: { width: 600, height: 400, top: 0, left: 0 },
            borderBoxSize: [{ inlineSize: 600, blockSize: 400 }],
            contentBoxSize: [{ inlineSize: 600, blockSize: 400 }],
            target: document.body,
          },
        ]);
      }, 0);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

// IntersectionObserver 兜底（面板懒加载可见性判定）
if (typeof globalThis.IntersectionObserver === 'undefined') {
  (globalThis as Record<string, unknown>).IntersectionObserver = class {
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

// scrollTo 兜底（文件树 / 终端滚动）
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => {};
}
