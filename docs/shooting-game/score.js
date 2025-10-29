export class Score {
  constructor() {
    this.value = 0;
  }

  add(points) {
    this.value += points;
  }

  draw(ctx) {
    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Score: ${this.value}`, 10, 20);
  }
}
