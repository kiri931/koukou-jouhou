import { spriteLoader } from './main.js';

export class Enemy {
  constructor(x, y, type = "normal") {
    this.x = x;
    this.y = y;
    this.type = type;

    if (type === "normal") {
      this.width = 20;
      this.height = 20;
      this.speed = 2;
      this.hp = 1;
      this.spriteIndex = 0;
    } else if (type === "fast") {
      this.width = 15;
      this.height = 15;
      this.speed = 4;
      this.hp = 1;
      this.spriteIndex = 1;
    } else if (type === "big") {
      this.width = 40;
      this.height = 40;
      this.speed = 1;
      this.hp = 1;
      this.spriteIndex = 2;
    } else if (type === "tough") {
      this.width = 25;
      this.height = 25;
      this.speed = 1.5;
      this.hp = 3;
      this.spriteIndex = 3;
    } else {
      this.width = 20;
      this.height = 20;
      this.speed = 2;
      this.hp = 1;
      this.spriteIndex = 0;
    }
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx) {

    if (spriteLoader.loaded) {
      spriteLoader.drawRotatedSprite(ctx, this.spriteIndex, this.x, this.y, this.width, this.height,Math.PI);
    } else {
      // 画像読み込み中のフォールバック表示
      ctx.fillStyle = "red";
      ctx.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  damage() {
    this.hp--;
  }

  isDead() {
    return this.hp <= 0;
  }
}

export function spawnEnemy(canvasWidth) {
  const types = ["normal", "fast", "big", "tough"];
  const randomType = types[Math.floor(Math.random() * types.length)];
  const x = Math.random() * (canvasWidth - 40);
  return new Enemy(x, -40, randomType);
}
