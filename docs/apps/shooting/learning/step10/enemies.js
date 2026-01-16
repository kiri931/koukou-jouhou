export const enemies = [];

const ENEMY_SIZE = 50;
const ENEMY_SPEED = 4;

export function spawnEnemy(canvas) {
  if (enemies.length >= 5) return;
  if (Math.random() < 0.03) {
    enemies.push({
      x: Math.random() * (canvas.width - ENEMY_SIZE),
      y: -ENEMY_SIZE,
      width: ENEMY_SIZE,
      height: ENEMY_SIZE,
      vy: ENEMY_SPEED,
    });
  }
}

export function updateEnemies(canvas) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.y += e.vy;
    if (e.y > canvas.height) enemies.splice(i, 1);
  }
}
