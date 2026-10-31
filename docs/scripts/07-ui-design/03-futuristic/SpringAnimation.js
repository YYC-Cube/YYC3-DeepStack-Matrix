class SpringAnimation {
  constructor(element, stiffness = 0.1, damping = 0.8) {
    this.element = element;
    this.stiffness = stiffness;
    this.damping = damping;
    this.velocity = 0;
    this.target = 0;
    this.current = 0;
  }

  animate() {
    const force = (this.target - this.current) * this.stiffness;
    this.velocity += force;
    this.velocity *= this.damping;
    this.current += this.velocity;

    this.element.style.transform = `translateY(${this.current}px)`;

    if (Math.abs(this.velocity) > 0.01) {
      requestAnimationFrame(() => this.animate());
    }
  }

  setTarget(value) {
    this.target = value;
    this.animate();
  }
}
