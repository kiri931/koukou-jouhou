export const STATE = {
  START: "start",
  PLAYING: "playing",
  GAMEOVER: "gameover",
};

export function createGame() {
  return {
    state: STATE.START,
    score: 0,
    scorePerKill: 100,
    life: 3,
    invincibleTimer: 0,
  };
}

export function resetToStart(game, player, canvas, bullets, enemies) {
  game.state = STATE.START;
  bullets.length = 0;
  enemies.length = 0;
  game.score = 0;
  game.life = 3;
  game.invincibleTimer = 0;
  player.x = canvas.width / 2 - player.width / 2;
}

export function startGame(game, player, canvas, bullets, enemies) {
  game.state = STATE.PLAYING;
  bullets.length = 0;
  enemies.length = 0;
  game.score = 0;
  game.life = 3;
  game.invincibleTimer = 0;
  player.x = canvas.width / 2 - player.width / 2;
}

export function tickTimers(game) {
  if (game.invincibleTimer > 0) game.invincibleTimer--;
}
