import { getVxPattern } from "./weapon.js";

export const bullets = [];

const BULLET_SIZE = 10;
const BULLET_SPEED_Y = -8;
let shootCooldown = 0;

export function resetShootCooldown() {
  shootCooldown = 0;
}

export function tryShoot(player, shootHeld, weapon) {
  if (shootCooldown > 0) shootCooldown--;
  if (!shootHeld) return;

  if (shootCooldown === 0) {
    const vxList = getVxPattern(weapon?.level);
    for (let i = 0; i < vxList.length; i++) {
      const vx = vxList[i];
      bullets.push({
        size: BULLET_SIZE,
        x: player.x + player.width / 2 - BULLET_SIZE / 2,
        y: player.y,
        vx,
        vy: BULLET_SPEED_Y,
      });
    }
    shootCooldown = 8;
  }
}

export function updateBullets(canvas) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    if (b.y + b.size < 0 || b.x + b.size < 0 || b.x > canvas.width) {
      bullets.splice(i, 1);
    }
  }
}
