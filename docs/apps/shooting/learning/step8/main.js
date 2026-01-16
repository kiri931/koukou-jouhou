const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 自機（Step7と同じ）
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

// 弾（複数）
const bullets = [];
const BULLET_SIZE = 10;
const BULLET_SPEED = -8;
let shootCooldown = 0;

// 敵（直進タイプだけ）を配列で管理
const enemies = [];
const ENEMY_SIZE = 50;
const ENEMY_SPEED = 4;

// 画像（背景・自機・敵）
const mapImage = new Image();
mapImage.src = "../image/map.png";

const playerImage = new Image();
playerImage.src = "../image/player.png";

const enemyImage = new Image();
enemyImage.src = "../image/enemy_straight.png";

function spawnBullet() {
  bullets.push({
    size: BULLET_SIZE,
    x: player.x + player.width / 2 - BULLET_SIZE / 2,
    y: player.y,
    vy: BULLET_SPEED,
  });
}

// 一定確率で敵を追加する（数が増えすぎないよう上限もつける）
function spawnEnemy() {
  if (enemies.length >= 5) return;

  // だいたい 60fps として、毎フレーム 3% で出る
  if (Math.random() < 0.03) {
    enemies.push({
      x: Math.random() * (canvas.width - ENEMY_SIZE),
      y: -ENEMY_SIZE,
      width: ENEMY_SIZE,
      height: ENEMY_SIZE,
      vy: ENEMY_SPEED,
    });
  }
}

function updatePlayer() {
  if (input.left) player.x -= player.speed;
  if (input.right) player.x += player.speed;

  if (player.x < 0) player.x = 0;
  if (player.x > canvas.width - player.width) {
    player.x = canvas.width - player.width;
  }
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.vy;
    if (b.y + b.size < 0) {
      bullets.splice(i, 1);
    }
  }
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.y += e.vy;

    // 画面外に出たら消す
    if (e.y > canvas.height) {
      enemies.splice(i, 1);
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

  // 自機（見た目だけ）
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

  // 敵
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (enemyImage.complete) {
      ctx.drawImage(enemyImage, e.x, e.y, e.width, e.height);
    } else {
      ctx.fillStyle = "crimson";
      ctx.fillRect(e.x, e.y, e.width, e.height);
    }
  }
}

function update() {
  // Spaceは押しっぱなしだと弾が増えすぎるので、軽いクールダウンを入れる
  if (shootCooldown > 0) shootCooldown--;

  updatePlayer();
  spawnEnemy();
  updateBullets();
  updateEnemies();
}

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") input.left = true;
  if (e.key === "ArrowRight") input.right = true;

  if (e.code === "Space") {
    if (shootCooldown === 0) {
      spawnBullet();
      shootCooldown = 8;
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") input.left = false;
  if (e.key === "ArrowRight") input.right = false;
});

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
