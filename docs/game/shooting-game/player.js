export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 32;  // 画像サイズに合わせて調整
    this.height = 32;
    this.speed = 3;

    // 画像の読み込み
    this.image = new Image();
    this.image.src = "image/player.png";
  }

  update(keys, canvas) {
    if (keys["ArrowLeft"] && this.x > 0) this.x -= this.speed;
    if (keys["ArrowRight"] && this.x < canvas.width - this.width) this.x += this.speed;
    if (keys["ArrowUp"] && this.y > 0) this.y -= this.speed;
    if (keys["ArrowDown"] && this.y < canvas.height - this.height) this.y += this.speed;
  }

  draw(ctx) {
    if (this.image.complete) {
      ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    } else {
      // 読み込み中なら仮の矩形
      ctx.fillStyle = "cyan";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }
}
