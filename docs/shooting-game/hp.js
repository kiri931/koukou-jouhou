export class HP {
  constructor(max = 3) {
    this.max = max;
    this.current = max;
  }

  damage(amount = 1) {
    this.current -= amount;
    if (this.current < 0) this.current = 0;
  }

  isZero() {
    return this.current <= 0;
  }

  draw(ctx, canvasWidth) {
    // テキスト表示
    ctx.fillStyle = "white";
    ctx.font = "16px sans-serif";
    ctx.fillText(`HP`, canvasWidth - 130, 20);

    // ライフゲージの背景
    ctx.fillStyle = "gray";
    ctx.fillRect(canvasWidth - 100, 10, 100, 10);

    // ライフゲージの中身
    ctx.fillStyle = "lime";
    const hpWidth = (this.current / this.max) * 100;
    ctx.fillRect(canvasWidth - 100, 10, hpWidth, 10);
  }

  reset() {
    this.current = this.max;
  }
}
