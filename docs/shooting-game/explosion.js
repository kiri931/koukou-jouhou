export class Explosion {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.maxRadius = 60;
    this.alpha = 1.0;
  }

  update() {
    this.radius += 3;
    this.alpha -= 0.03;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 100, 0, ${this.alpha})`;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  isDone() {
    return this.alpha <= 0;
  }
}
