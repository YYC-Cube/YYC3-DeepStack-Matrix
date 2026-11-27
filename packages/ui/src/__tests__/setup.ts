/**
 * @file: setup.ts
 * @description: ui 测试 setup — jest-dom matchers 注入
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import '@testing-library/jest-dom/vitest';

// jsdom 无 matchMedia（useIsMobile / sidebar / drawer 等需要）
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

// ResizeObserver 兜底（recharts / embla / vaul / ChartContainer 尺寸测量）
// — 异步回调一次模拟尺寸，让 ChartContainer 的 shouldRender 门通过
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

if (typeof globalThis.DOMRect === 'undefined') {
  // vaul / popover 定位需要
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DOMRect = class {
    top = 0;
    left = 0;
    bottom = 0;
    right = 0;
    width = 0;
    height = 0;
    x = 0;
    y = 0;
    toJSON() {
      return {};
    }
  };
}

// IntersectionObserver 兜底（embla-carousel 需要）
if (typeof globalThis.IntersectionObserver === 'undefined') {
  (globalThis as Record<string, unknown>).IntersectionObserver = class {
    root = null;
    rootMargin = '';
    thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

// scrollTo 兜底
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => {};
}
