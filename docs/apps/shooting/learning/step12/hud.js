import { STATE } from "./game.js";

export function drawHud(ctx, game) {
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`SCORE: ${game.score}`, 12, 24);
  ctx.fillText(`LIFE: ${game.life}`, 12, 46);
}

export function drawOverlay(ctx, canvas, title, sub) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = "28px sans-serif";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = "16px sans-serif";
  ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 24);
  ctx.textAlign = "left";
}

export function drawStateOverlays(ctx, canvas, game) {
  if (game.state === STATE.START) {
    drawOverlay(ctx, canvas, "START", "Spaceで開始");
  }
  if (game.state === STATE.GAMEOVER) {
    drawOverlay(ctx, canvas, "GAME OVER", "Spaceでスタートに戻る");
  }
}
