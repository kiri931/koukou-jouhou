import { mapImage, playerImage, enemyImage } from "./assets.js";
import { initInput, input } from "./input.js";
import { STATE, createGame, resetToStart, startGame, tickTimers } from "./game.js";
import { createPlayer, updatePlayer } from "./player.js";
import { bullets, resetShootCooldown, tryShoot, updateBullets } from "./bullets.js";
import { enemies, spawnEnemy, updateEnemies } from "./enemies.js";
import { handleBulletEnemyCollisions, handlePlayerEnemyCollisions } from "./collision.js";
import { drawHud, drawStateOverlays } from "./hud.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

initInput();
const player = createPlayer(canvas);
const game = createGame();

let spaceHeld = false;
window.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  spaceHeld = true;

  if (game.state === STATE.START) {
    startGame(game, player, canvas, bullets, enemies);
    resetShootCooldown();
    return;
  }
  if (game.state === STATE.GAMEOVER) {
    resetToStart(game, player, canvas, bullets, enemies);
    resetShootCooldown();
    return;
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space") spaceHeld = false;
});

function updatePlaying() {
  tickTimers(game);
  updatePlayer(player, canvas, input);
  tryShoot(player, spaceHeld);
  updateBullets();

  spawnEnemy(canvas);
  updateEnemies(canvas);
  handleBulletEnemyCollisions(bullets, enemies, game);
  handlePlayerEnemyCollisions(player, enemies, game);
}

function drawBackground() {
  if (mapImage.complete) {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawEntities() {
  // 自機（無敵中は点滅）
  const blink = game.invincibleTimer > 0 && Math.floor(game.invincibleTimer / 6) % 2 === 0;
  if (!blink) {
    if (playerImage.complete) {
      ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    } else {
      ctx.fillStyle = "yellow";
      ctx.fillRect(player.x, player.y, player.width, player.height);
    }
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

function draw() {
  drawBackground();
  drawEntities();
  drawHud(ctx, game);
  drawStateOverlays(ctx, canvas, game);
}

function gameLoop() {
  if (game.state === STATE.PLAYING) updatePlaying();
  draw();
  requestAnimationFrame(gameLoop);
}

resetToStart(game, player, canvas, bullets, enemies);
gameLoop();
