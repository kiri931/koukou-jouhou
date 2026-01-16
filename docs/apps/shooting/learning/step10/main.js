import { mapImage, playerImage, enemyImage } from "./assets.js";
import { initInput, input } from "./input.js";
import { createPlayer, updatePlayer } from "./player.js";
import { bullets, tryShoot, updateBullets } from "./bullets.js";
import { enemies, spawnEnemy, updateEnemies } from "./enemies.js";
import { handleBulletEnemyCollisions } from "./collision.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

initInput();
const player = createPlayer(canvas);

function update() {
  updatePlayer(player, canvas, input);
  tryShoot(player, input);
  updateBullets();

  spawnEnemy(canvas);
  updateEnemies(canvas);
  handleBulletEnemyCollisions(bullets, enemies);
}

function draw() {
  // 背景
  if (mapImage.complete) {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 自機
  if (playerImage.complete) {
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
  } else {
    ctx.fillStyle = "yellow";
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }

  // 弾
  ctx.fillStyle = "white";
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    const r = b.size / 2;
    const cx = b.x + r;
    const cy = b.y + r;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 敵
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (enemyImage.complete) {
      ctx.drawImage(enemyImage, e.x, e.y, e.width, e.height);
    } else {
      ctx.fillStyle = "crimson";
      ctx.fillRect(e.x, e.y, e.width, e.height);
    }
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
