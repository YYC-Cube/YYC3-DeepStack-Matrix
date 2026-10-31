// 实时同步接口
interface RealTimeSync {
  // 设置变更广播
  broadcastSettingsChange: (change: SettingsChange) => void;
  
  // 设置变更订阅
  subscribeToSettingsChange: (callback: (change: SettingsChange) => void) => () => void;
  
  // 跨标签页同步
  syncAcrossTabs: (settings: SettingsConfig) => Promise<void>;
  
  // 跨设备同步
  syncAcrossDevices: (settings: SettingsConfig) => Promise<void>;
}

// 设置变更接口
interface SettingsChange {
  type: 'model' | 'conversation' | 'rules' | 'skills' | 'general';
  key: string;
  value: any;
  timestamp: number;
  source: 'local' | 'remote';
}

// 实时同步实现
export class RealTimeSyncManager implements RealTimeSync {
  private subscribers: Map<string, ((change: SettingsChange) => void)[]> = new Map();
  private socket: Socket | null = null;
  
  constructor() {
    this.initializeWebSocket();
    this.setupBroadcastChannel();
  }
  
  private initializeWebSocket(): void {
    // 连接到WebSocket服务器
    this.socket = io(process.env.VITE_WS_URL);
    
    // 监听设置变更
    this.socket.on('settings:change', (change: SettingsChange) => {
      this.notifySubscribers(change);
    });
  }
  
  private setupBroadcastChannel(): void {
    // 设置Broadcast Channel用于跨标签页同步
    const channel = new BroadcastChannel('yyc3-settings');
    
    channel.onmessage = (event) => {
      const change: SettingsChange = JSON.parse(event.data);
      this.notifySubscribers(change);
    };
    
    // 广播设置变更
    this.broadcastSettingsChange = (change: SettingsChange) => {
      channel.postMessage(JSON.stringify(change));
    };
  }
  
  subscribeToSettingsChange(callback: (change: SettingsChange) => void): () => void {
    const id = Date.now().toString();
    
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, []);
    }
    
    this.subscribers.get(id)!.push(callback);
    
    // 返回取消订阅函数
    return () => {
      const callbacks = this.subscribers.get(id);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
  
  private notifySubscribers(change: SettingsChange): void {
    this.subscribers.forEach((callbacks) => {
      callbacks.forEach(callback => {
        try {
          callback(change);
        } catch (error) {
          console.error('Error in settings change subscriber:', error);
        }
      });
    });
  }
  
  async syncAcrossTabs(settings: SettingsConfig): Promise<void> {
    this.broadcastSettingsChange({
      type: 'general',
      key: 'full',
      value: settings,
      timestamp: Date.now(),
      source: 'local',
    });
  }
  
  async syncAcrossDevices(settings: SettingsConfig): Promise<void> {
    // 通过WebSocket同步到其他设备
    if (this.socket) {
      this.socket.emit('settings:sync', settings);
    }
  }
}

export const realTimeSyncManager = new RealTimeSyncManager();
