/**
 * @file: setup.ts
 * @description: core 测试 setup — fake-indexeddb 注入 + 环境兜底
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import 'fake-indexeddb/auto';

// jsdom 无 matchMedia（GitService detectPlatform / useIsMobile 等需要）
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

// BroadcastChannel 可用性兜底（jsdom 29 已原生支持，防御旧版缺失）
// RTCPeerConnection 兜底（network-utils getLocalIP 走 catch 分支 → 127.0.0.1）
if (typeof globalThis.RTCPeerConnection === 'undefined') {
  (globalThis as Record<string, unknown>).RTCPeerConnection = class {
    createDataChannel() {}
    async createOffer() {
      return { sdp: '', type: 'offer' };
    }
    async setLocalDescription() {}
    close() {}
  } as unknown as typeof RTCPeerConnection;
}
