# Step4: 画像で自機を表示する

## このStepでできること
- 四角の代わりに、画像（`player.png`）で自機を描きます。

## 前Stepからの差分
- `new Image()`で画像を読み込み、`playerImage.src = "../image/player.png"` を設定します。
- `playerImage.onload`で「読み込み完了」を受け取り、画像が使える状態で`draw()`します。
- 描画時は、画像が読み込み済みなら`ctx.drawImage(...)`、未読み込みなら四角で代用します。

## Playgroundで確認する（変更が見えるポイント）
- 右側のJSで画像パスをわざと変えると、画像が出ず四角のままになる（フォールバックが確認できる）。
- `player.width`/`player.height`を変えると、画像の表示サイズが変わる。
