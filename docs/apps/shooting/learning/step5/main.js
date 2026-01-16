const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 自機のデータ（位置・大きさ・スピード）
const player = {
  width: 30,
  height: 30,
  x: canvas.width / 2 - 30 / 2,
  y: canvas.height - 60,
  speed: 5,
};

// キーを押しているかどうか（押しっぱなしで動き続けるため）
const input = {
  left: false,
  right: false,
};

// 画像（背景と自機）
const mapImage = new Image();
mapImage.src = "../image/map.png";

const playerImage = new Image();
playerImage.src = "../image/player.png";

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") input.left = true;
  if (e.key === "ArrowRight") input.right = true;
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") input.left = false;
  if (e.key === "ArrowRight") input.right = false;
});

// 1フレーム分の更新（座標などを変える）
function update() {
  if (input.left) player.x -= player.speed;
  if (input.right) player.x += player.speed;

  // 画面外に出ないようにする
  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) {
    player.x = canvas.width - player.width;
  }
}

// 1フレーム分の描画（見た目を描く）
function draw() {
  // 背景
  if (mapImage.complete) {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 自機
  if (playerImage.complete) {
    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
  } else {
    ctx.fillStyle = "yellow";
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }
}

// ゲームループ（更新→描画を毎フレーム繰り返す）
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
