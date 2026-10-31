class RealTimeChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = [];
    this.maxPoints = 100;
    this.animate();
  }

  addData(value) {
    this.data.push(value);
    if (this.data.length > this.maxPoints) {
      this.data.shift();
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制渐变填充
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.8)');
    gradient.addColorStop(1, 'rgba(102, 126, 234, 0.1)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height);

    this.data.forEach((value, index) => {
      const x = (index / this.maxPoints) * this.canvas.width;
      const y = this.canvas.height - (value * this.canvas.height);
      this.ctx.lineTo(x, y);
    });

    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.closePath();
    this.ctx.fill();

    // 绘制发光线条
    this.ctx.strokeStyle = '#667eea';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#667eea';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();

    requestAnimationFrame(() => this.animate());
  }
}
