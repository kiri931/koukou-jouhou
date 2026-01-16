const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  width: 30,
  height: 30,
  x: canvas.width / 2 - 30 / 2,
  y: canvas.height - 60,
  speed: 10,
};

function draw() {
  // 背景を塗り直す（前のフレームの四角を消すため）
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 自機を描く
  ctx.fillStyle = "yellow";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// キー入力で座標を変える
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    player.x -= player.speed;
  } else if (e.key === "ArrowRight") {
    player.x += player.speed;
  }

  // 画面外に出ないようにする
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) {
    player.x = canvas.width - player.width;
  }

  // 動いたら描き直す
  draw();
});

// 最初の1回描画
draw();
