import { bossSprite } from './main.js'; // ローダーをインポート

export class Boss {
  constructor(canvasWidth) {
    this.x = canvasWidth / 2 - 50;
    this.y = -100;
    this.width = 100;
    this.height = 60;
    this.speed = 1.5;
    this.hp = 30;
    this.spriteIndex = 0;  // 使用するスプライトのインデックス
    this.bullets = [];
    this.shotInterval = 60;
    this.shotTimer = 0;
  }

  update() {
    if (this.y < 50) {
      this.y += this.speed;
    } else {
      this.shotTimer++;
      if (this.shotTimer >= this.shotInterval) {
        this.shoot();
        this.shotTimer = 0;
      }
    }

    this.bullets.forEach(b => b.y += b.speed);
    this.bullets = this.bullets.filter(b => b.y < 640);
  }

  draw(ctx) {
    // 🖼️ スプライト描画
    if (bossSprite.loaded) {
      bossSprite.drawSprite(ctx, this.spriteIndex, this.x, this.y, this.width, this.height);
    } else {
      // 読み込み前の代替描画
      ctx.fillStyle = "purple";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // 💉 HPバー
    ctx.fillStyle = "white";
    ctx.fillRect(this.x, this.y - 10, this.width, 5);
    ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y - 10, (this.hp / 30) * this.width, 5);

    // 🔫 弾描画
    this.bullets.forEach(b => {
      ctx.fillStyle = "orange";
      ctx.fillRect(b.x, b.y, b.width, b.height);
    });
  }

  shoot() {
    const bulletSpeed = 3;
    const centerX = this.x + this.width / 2;
    this.bullets.push(
      { x: centerX - 2, y: this.y + this.height, width: 4, height: 10, speed: bulletSpeed },
      { x: centerX - 20, y: this.y + this.height, width: 4, height: 10, speed: bulletSpeed },
      { x: centerX + 16, y: this.y + this.height, width: 4, height: 10, speed: bulletSpeed }
    );
  }

  damage() {
    this.hp--;
  }

  isDead() {
    return this.hp <= 0;
  }

  getBullets() {
    return this.bullets;
  }
}
