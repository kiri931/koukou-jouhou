export function createPlayer(canvas) {
  return {
    width: 30,
    height: 30,
    x: canvas.width / 2 - 30 / 2,
    y: canvas.height - 60,
    speed: 5,
  };
}

export function updatePlayer(player, canvas, input) {
  if (input.left) player.x -= player.speed;
  if (input.right) player.x += player.speed;

  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) {
    player.x = canvas.width - player.width;
  }
}
