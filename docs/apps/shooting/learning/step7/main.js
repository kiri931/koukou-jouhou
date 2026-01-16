const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 自機
const player = {
  width: 30,
  height: 30,
  x: canvas.width / 2 - 30 / 2,
  y: canvas.height - 60,
  speed: 5,
};

// 入力（押しっぱなし対応）
const input = {
  left: false,
  right: false,
};

// 弾（複数を配列で管理する）
const bullets = [];

const BULLET_SIZE = 10;
const BULLET_SPEED = -8;

const mapImage = new Image();
mapImage.src = "../image/map.png";

const playerImage = new Image();
playerImage.src = "../image/player.png";

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") input.left = true;
  if (e.key === "ArrowRight") input.right = true;

  // Space を押したら弾を配列に追加する（何発でもOK）
  if (e.code === "Space") {
    bullets.push({
      size: BULLET_SIZE,
      x: player.x + player.width / 2 - BULLET_SIZE / 2,
      y: player.y,
      vy: BULLET_SPEED,
    });
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") input.left = false;
  if (e.key === "ArrowRight") input.right = false;
});

function update() {
  // 自機の移動
  if (input.left) player.x -= player.speed;
  if (input.right) player.x += player.speed;

  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) {
    player.x = canvas.width - player.width;
  }

  // 弾の移動（配列を後ろから回すと削除しやすい）
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.vy;

    // 画面の外に出た弾は消す
    if (b.y + b.size < 0) {
      bullets.splice(i, 1);
    }
  }
}

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

  // 弾（白い丸を複数描く）
  ctx.fillStyle = "white";
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    const r = b.size / 2;
    const cx = b.x + r;
    const cy = b.y + r;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
