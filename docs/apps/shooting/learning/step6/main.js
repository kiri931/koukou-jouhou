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

// 弾（配列ではなく、1個だけ持つ）
// Step6では「配列」で持ちつつ、1発だけに制限する
// （Step7でこの制限を外して複数にする）
const bullets = [];

const mapImage = new Image();
mapImage.src = "../image/map.png";

const playerImage = new Image();
playerImage.src = "../image/player.png";

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") input.left = true;
  if (e.key === "ArrowRight") input.right = true;

  // Space を押したら弾を作る（弾が無いときだけ）
  if (e.code === "Space") {
    if (bullets.length === 0) {
      bullets.push({
        size: 10,
        x: player.x + player.width / 2 - 10 / 2,
        y: player.y,
        vy: -8,
      });
    }
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

  // 弾の移動（配列だが、Step6では最大1個）
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.vy;

    // 画面の外に出たら弾を消す（また撃てるようになる）
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

  // 弾（白い丸）
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
