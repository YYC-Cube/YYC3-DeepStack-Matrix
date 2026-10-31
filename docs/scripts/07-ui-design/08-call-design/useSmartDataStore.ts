import { create } from 'zustand';

interface SmartDataStore {
  // 缓存管理
  cache: Map<string, any>;
  setCache: (key: string, value: any) => void;
  getCache: (key: string) => any;
  
  // 优先队列
  queue: Task[];
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  
  // 数据流
  streams: Map<string, DataStream>;
  createStream: (streamId: string) => void;
  closeStream: (streamId: string) => void;
}

export const useSmartDataStore = create<SmartDataStore>((set, get) => ({
  cache: new Map(),
  setCache: (key, value) => {
    const { cache } = get();
    cache.set(key, value);
    set({ cache });
  },
  getCache: (key) => {
    const { cache } = get();
    return cache.get(key);
  },
  
  queue: [],
  addTask: (task) => {
    const { queue } = get();
    queue.push(task);
    set({ queue });
  },
  removeTask: (taskId) => {
    const { queue } = get();
    set({ queue: queue.filter(t => t.id !== taskId) });
  },
  
  streams: new Map(),
  createStream: (streamId) => {
    const { streams } = get();
    streams.set(streamId, new DataStream());
    set({ streams });
  },
  closeStream: (streamId) => {
    const { streams } = get();
    const stream = streams.get(streamId);
    stream?.close();
    streams.delete(streamId);
    set({ streams });
  },
}));
