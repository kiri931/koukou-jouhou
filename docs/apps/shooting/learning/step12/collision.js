import { STATE } from "./game.js";

export function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy <= r * r;
}

export function handleBulletEnemyCollisions(bullets, enemies, game) {
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    const br = b.size / 2;
    const bcx = b.x + br;
    const bcy = b.y + br;

    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      const er = Math.min(e.width, e.height) / 2;
      const ecx = e.x + e.width / 2;
      const ecy = e.y + e.height / 2;

      if (circleHit(bcx, bcy, br, ecx, ecy, er)) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        game.score += game.scorePerKill;
        break;
      }
    }
  }
}

export function handlePlayerEnemyCollisions(player, enemies, game) {
  if (game.invincibleTimer > 0) return;

  const pr = Math.min(player.width, player.height) / 2;
  const pcx = player.x + player.width / 2;
  const pcy = player.y + player.height / 2;

  for (let ei = enemies.length - 1; ei >= 0; ei--) {
    const e = enemies[ei];
    const er = Math.min(e.width, e.height) / 2;
    const ecx = e.x + e.width / 2;
    const ecy = e.y + e.height / 2;

    if (circleHit(pcx, pcy, pr, ecx, ecy, er)) {
      enemies.splice(ei, 1);
      game.life -= 1;
      game.invincibleTimer = 60;
      if (game.life <= 0) game.state = STATE.GAMEOVER;
      break;
    }
  }
}
