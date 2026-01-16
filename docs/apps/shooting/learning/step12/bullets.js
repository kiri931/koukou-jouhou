export const bullets = [];

const BULLET_SIZE = 10;
const BULLET_SPEED_Y = -8;
let shootCooldown = 0;

export function resetShootCooldown() {
  shootCooldown = 0;
}

export function tryShoot(player, shootHeld) {
  if (shootCooldown > 0) shootCooldown--;
  if (!shootHeld) return;

  if (shootCooldown === 0) {
    bullets.push({
      size: BULLET_SIZE,
      x: player.x + player.width / 2 - BULLET_SIZE / 2,
      y: player.y,
      vy: BULLET_SPEED_Y,
    });
    shootCooldown = 8;
  }
}

export function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.vy;
    if (b.y + b.size < 0) bullets.splice(i, 1);
  }
}
