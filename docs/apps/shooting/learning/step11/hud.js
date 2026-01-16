export const hud = {
  score: 0,
  scorePerKill: 100,
};

export function addScoreKill() {
  hud.score += hud.scorePerKill;
}

export function drawHud(ctx) {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`SCORE: ${hud.score}`, 12, 24);
}
