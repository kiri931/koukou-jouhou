const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  width: 30,
  height: 30,
  x: canvas.width / 2 - 30 / 2,
  y: canvas.height - 60,
  speed: 10,
};

// 画像を読み込む
const playerImage = new Image();
// learning/step4 から見た相対パス（learning/image/player.png）
playerImage.src = "../image/player.png";

let isImageLoaded = false;
playerImage.onload = () => {
  isImageLoaded = true;
  draw();
};

function draw() {
  // 背景を塗り直す（前のフレームを消す）
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 画像が読み込めたら drawImage で描く
  if (isImageLoaded) {
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    return;
  }

  // 画像がまだ読み込めていない間は四角で代用
  ctx.fillStyle = "yellow";
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

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

  draw();
});

// 最初の1回描画（画像読み込み前の四角が出る）
draw();
