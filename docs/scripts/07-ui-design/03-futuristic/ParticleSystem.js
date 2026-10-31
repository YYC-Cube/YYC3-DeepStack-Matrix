class ParticleSystem {
  constructor(container, count = 30) {
    this.container = container;
    this.particles = [];
    this.initParticles(count);
    this.animate();
  }

  initParticles(count) {
    for (let i = 0; i < count; i++) {
      const particle = {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 4 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        opacity: Math.random() * 0.5 + 0.2
      };
      this.particles.push(particle);
    }
  }

  animate() {
    this.particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0 || p.x > window.innerWidth) p.speedX *= -1;
      if (p.y < 0 || p.y > window.innerHeight) p.speedY *= -1;
    });

    requestAnimationFrame(() => this.animate());
  }
}
