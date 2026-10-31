// 扩展音效系统
class SoundEffectsManager {
  // 现有音效...
  
  // 设置页面专用音效
  playSettings(action: 'save' | 'reset' | 'import' | 'export'): void {
    switch (action) {
      case 'save':
        this.play('confirm');
        break;
      case 'reset':
        this.play('dismiss');
        break;
      case 'import':
        this.play('messageReceive');
        break;
      case 'export':
        this.play('messageSend');
        break;
    }
  }
  
  playNotification(type: 'complete' | 'waiting' | 'interrupt'): void {
    switch (type) {
      case 'complete':
        this.play('confirm');
        break;
      case 'waiting':
        this.play('typing');
        break;
      case 'interrupt':
        this.play('dismiss');
        break;
    }
  }
}
