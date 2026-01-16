# Step5: ゲームループ（更新→描画）

## このStepでできること
- `requestAnimationFrame`で、毎フレーム「更新→描画」を繰り返すゲームループを作ります。

## 前Stepからの差分
- `update()`（座標などの更新）と`draw()`（描画）を分けます。
- `gameLoop()`を作り、`update(); draw(); requestAnimationFrame(gameLoop);` の形にします。
- これ以降のStepは、基本的に`update()`に処理を足していきます。

## Playgroundで確認する（変更が見えるポイント）
- 右側のJSで`update()`内に仮の処理（例: `player.x += 1`）を入れると、自動で動く。
- `requestAnimationFrame`を止める/呼ばないと動かなくなる（ループの役割が見える）。
