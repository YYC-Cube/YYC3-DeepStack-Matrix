class DynamicColor {
  constructor(element) {
    this.element = element;
    this.hue = 0;
    this.animate();
  }

  animate() {
    this.hue = (this.hue + 1) % 360;
    const color = `hsl(${this.hue}, 70%, 60%)`;
    this.element.style.color = color;
    this.element.style.boxShadow = `0 0 20px ${color}`;
    requestAnimationFrame(() => this.animate());
  }
}
