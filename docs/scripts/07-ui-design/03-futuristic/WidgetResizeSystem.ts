class WidgetResizeSystem {
  private widget: HTMLElement;
  private resizeHandle: HTMLElement;
  private isResizing: boolean = false;
  private startWidth: number = 0;
  private startHeight: number = 0;
  private startX: number = 0;
  private startY: number = 0;

  constructor(widget: HTMLElement, resizeHandle: HTMLElement) {
    this.widget = widget;
    this.resizeHandle = resizeHandle;
    this.initializeResize();
  }

  private initializeResize(): void {
    this.resizeHandle.addEventListener('mousedown', this.startResize.bind(this));
    document.addEventListener('mousemove', this.resize.bind(this));
    document.addEventListener('mouseup', this.endResize.bind(this));
  }

  private startResize(e: MouseEvent): void {
    this.isResizing = true;
    this.startWidth = this.widget.offsetWidth;
    this.startHeight = this.widget.offsetHeight;
    this.startX = e.clientX;
    this.startY = e.clientY;

    this.widget.style.transition = 'none';
    e.preventDefault();
  }

  private resize(e: MouseEvent): void {
    if (!this.isResizing) return;

    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    this.widget.style.width = `${Math.max(320, this.startWidth + deltaX)}px`;
    this.widget.style.height = `${Math.max(480, this.startHeight + deltaY)}px`;
  }

  private endResize(): void {
    this.isResizing = false;
    this.widget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }
}
