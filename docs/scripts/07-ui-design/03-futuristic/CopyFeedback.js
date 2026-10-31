class CopyFeedback {
  constructor(button) {
    this.button = button;
    this.originalText = button.textContent;
    this.setupListeners();
  }

  setupListeners() {
    this.button.addEventListener('click', () => this.showFeedback());
  }

  showFeedback() {
    this.button.textContent = '✓ 已复制';
    this.button.style.background = '#10b981';

    setTimeout(() => {
      this.button.textContent = this.originalText;
      this.button.style.background = '';
    }, 2000);
  }
}
