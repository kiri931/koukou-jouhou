import { Player } from './player.js';
import { Bullet } from './bullet.js';
import { Enemy, spawnEnemy } from './enemy.js';
import { keys, setupInput } from './input.js';
import { isColliding } from './collision.js';
import { Score } from './score.js';
import { HP } from './hp.js';
import { Boss } from './boss.js';
import { Explosion } from './explosion.js';
import { SpriteSheetLoader } from './spriteLoader.js';
import { TitleScreen } from './titleScreen.js';
export const spriteLoader = new SpriteSheetLoader("image/enemy.png", 2, 2); 
export const bossSprite = new SpriteSheetLoader("image/dragon.png", 1, 1);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = new Player(canvas.width / 2 - 10, canvas.height - 50);
const score = new Score();
const hp = new HP(3);
const titleScreen = new TitleScreen(ctx, ["Start Game", "Exit", "Settings"]);

let bullets = [];
let enemies = [];
let boss = null;
let bossSpawned = false;

let explosions = []; // 爆発エフェクト用

let gameState = "title";  // "title", "playing", "gameover", "clear"


// 敵出現タイマー（1秒ごと）
setupInput();
setInterval(() => {
  if (gameState === "playing" && !boss) {
    enemies.push(spawnEnemy(canvas.width));
  }
}, 1000);


function update() {
  if (gameState !== "playing") return;

  player.update(keys, canvas);

  bullets.forEach(b => b.update());
  bullets = bullets.filter(b => b.y > -b.height);

  enemies.forEach(e => e.update());
  enemies = enemies.filter(e => e.y < canvas.height + e.height);

  // 弾と敵の衝突
bullets.forEach((b, bi) => {
  enemies.forEach((e, ei) => {
    if (isColliding(b, e)) {
      bullets.splice(bi, 1);
      e.damage(); // タイプにより複数HP対応
      if (e.isDead()) {
        enemies.splice(ei, 1);
        score.add(100);
      }
    }
  });
});


  // プレイヤーと敵の衝突
  enemies.forEach((e, ei) => {
    if (isColliding(player, e)) {
      enemies.splice(ei, 1);
      hp.damage(1);
      if (hp.isZero()) {
        gameState = "gameover";
      }
    }
  });

  // スコア到達でボス出現
  if (!bossSpawned && score.value >= 1000) {
    boss = new Boss(canvas.width);
    bossSpawned = true;
  }

  explosions.forEach(e => e.update());
explosions = explosions.filter(e => !e.isDone());


  // ボス処理
if (boss) {
  boss.update();

  // 🎯 弾がボスに当たったらダメージ＆削除
  const bulletsToRemove = [];
  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i];
    if (isColliding(bullet, boss)) {
      boss.damage();
      bulletsToRemove.push(i);
    }
  }
  bulletsToRemove.reverse().forEach(i => bullets.splice(i, 1));

  // 🔫 ボスの弾とプレイヤーの当たり（← boss が null になる前に処理）
  const bossBullets = boss.getBullets();
  const bossHits = [];

  for (let i = 0; i < bossBullets.length; i++) {
    if (isColliding(player, bossBullets[i])) {
      bossHits.push(i);
      hp.damage(1);
      if (hp.isZero()) {
        gameState = "gameover";
        break;
      }
    }
  }
  bossHits.reverse().forEach(i => bossBullets.splice(i, 1));

  // 🔥 プレイヤーとボスの当たり
  if (isColliding(player, boss)) {
    hp.damage(1);
    if (hp.isZero()) {
      gameState = "gameover";
    }
  }

  // 💥 ボス撃破時（最後に boss を null にする）
  if (boss.isDead()) {
    explosions.push(new Explosion(boss.x + boss.width / 2, boss.y + boss.height / 2));
    gameState = "clear";
    boss = null;
  }
}


}

// 🔁 draw 関数を修正
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === "title") {
    titleScreen.draw();  // ← クラスのメソッドを呼ぶ
    return;
  }

  player.draw(ctx);
  bullets.forEach(b => b.draw(ctx));
  enemies.forEach(e => e.draw(ctx));
  if (boss) boss.draw(ctx);
  score.draw(ctx);
  hp.draw(ctx, canvas.width);
  explosions.forEach(e => e.draw(ctx));

  if (gameState === "gameover") {
    ctx.fillStyle = "white";
    ctx.font = "32px sans-serif";
    ctx.fillText("GAME OVER", canvas.width / 2 - 90, canvas.height / 2);
  }

  if (gameState === "clear") {
    ctx.fillStyle = "yellow";
    ctx.font = "32px sans-serif";
    ctx.fillText("MISSION COMPLETE!", canvas.width / 2 - 150, canvas.height / 2);
  }
}



function loop() {
  if (gameState === "playing") {
    update();
  }
  draw();
  requestAnimationFrame(loop); // 常に描画は続ける
}

loop();


document.addEventListener("keydown", (e) => {
  if (gameState === "title") {
    const action = titleScreen.handleKeyDown(e);
    if (action === "Start Game") resetGame();
    if (action === "Exit") window.close();
    if (action === "Settings") console.log("Settings menu not implemented yet.");
  } else if (gameState === "playing") {
    if (e.code === "Space") {
      bullets.push(new Bullet(player.x + player.width / 2 - 2, player.y));
    }
  } else if (["gameover", "clear"].includes(gameState)) {
    if (e.code === "Enter") {
      resetGame();
    }
  }
});



function resetGame() {
  player.x = canvas.width / 2 - 10;
  player.y = canvas.height - 50;
  bullets.length = 0;
  enemies.length = 0;
  boss = null;
  bossSpawned = false;
  score.value = 0;
  hp.reset();
  gameState = "playing";
}


