const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// プレイヤー設定
const player = {
  x: canvas.width / 2 - 10,
  y: canvas.height - 50,
  width: 20,
  height: 20,
  speed: 5,
  color: "cyan"
};

// 弾データ
let bullets = [];

// キー入力管理
const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space") shoot();
});

document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});



// 弾を発射
function shoot() {
  bullets.push({
    x: player.x + player.width / 2 - 2,
    y: player.y,
    width: 4,
    height: 10,
    speed: 7,
    color: "yellow"
  });
}

// メインループ
function update() {
  // 移動
  if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x < canvas.width - player.width) player.x += player.speed;
  if (keys["ArrowUp"] && player.y > 0) player.y -= player.speed;
  if (keys["ArrowDown"] && player.y < canvas.height - player.height) player.y += player.speed;

  // 弾移動
  bullets = bullets.filter(bullet => bullet.y > -bullet.height);
  bullets.forEach(bullet => bullet.y -= bullet.speed);
}

// 描画
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // プレイヤー
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // 弾
  bullets.forEach(bullet => {
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

// ループ
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
