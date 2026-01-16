export const ENEMY_TYPE = {
  STRAIGHT: "straight",
  HOMING: "homing",
};

export const enemies = [];

const ENEMY_SIZE = 50;
const ENEMY_SPEED = 3.6;
const ENEMY_HOMING_SPEED = 2.4;

export function spawnEnemy(canvas) {
  if (enemies.length >= 7) return;
  if (Math.random() < 0.03) {
    const type = Math.random() < 0.5 ? ENEMY_TYPE.STRAIGHT : ENEMY_TYPE.HOMING;
    enemies.push({
      type,
      x: Math.random() * (canvas.width - ENEMY_SIZE),
      y: -ENEMY_SIZE,
      width: ENEMY_SIZE,
      height: ENEMY_SIZE,
      vy: ENEMY_SPEED,
    });
  }
}

export function updateEnemies(canvas, player) {
  const pcx = player.x + player.width / 2;
  const pcy = player.y + player.height / 2;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    if (e.type === ENEMY_TYPE.STRAIGHT) {
      e.y += e.vy;
    } else {
      const ecx = e.x + e.width / 2;
      const ecy = e.y + e.height / 2;
      const dx = pcx - ecx;
      const dy = pcy - ecy;
      const len = Math.hypot(dx, dy) || 1;
      e.x += (dx / len) * ENEMY_HOMING_SPEED;
      e.y += (dy / len) * ENEMY_HOMING_SPEED;
    }

    if (e.y > canvas.height + ENEMY_SIZE) {
      enemies.splice(i, 1);
    }
  }
}
