interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
}

class WidgetDragSystem {
  private dragState: DragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  };

  private widget: HTMLElement;
  private header: HTMLElement;

  constructor(widget: HTMLElement, header: HTMLElement) {
    this.widget = widget;
    this.header = header;
    this.initializeDrag();
  }

  private initializeDrag(): void {
    this.header.addEventListener('mousedown', this.startDrag.bind(this));
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.endDrag.bind(this));
  }

  private startDrag(e: MouseEvent): void {
    this.dragState.isDragging = true;
    this.dragState.startX = e.clientX;
    this.dragState.startY = e.clientY;
    this.dragState.initialX = this.widget.offsetLeft;
    this.dragState.initialY = this.widget.offsetTop;

    this.widget.style.transition = 'none';
  }

  private drag(e: MouseEvent): void {
    if (!this.dragState.isDragging) return;

    const deltaX = e.clientX - this.dragState.startX;
    const deltaY = e.clientY - this.dragState.startY;

    this.widget.style.left = `${this.dragState.initialX + deltaX}px`;
    this.widget.style.top = `${this.dragState.initialY + deltaY}px`;
  }

  private endDrag(): void {
    this.dragState.isDragging = false;
    this.widget.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }
}
