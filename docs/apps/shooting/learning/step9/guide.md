# Step9: ファイルを分けよう（モジュール化）

## このStepでできること
- 1つの`main.js`に全部書くのではなく、役割ごとにファイルを分けます。
- ES Modules（`type="module"`）で読み込み、`import`/`export`でつなぎます。

## 前Stepからの差分
- 役割分割（例）
  - `assets.js`: 画像の読み込み
  - `input.js`: 押しっぱなし入力
  - `player.js`: プレイヤー生成・更新
  - `bullets.js`: 弾配列・発射・更新
  - `enemies.js`: 敵配列・出現・更新
  - `main.js`: 全体のループ（update/draw）
- それぞれの配列（`bullets`, `enemies`）はモジュール側で持ち、`main.js`は「呼び出すだけ」に寄せています。

## Playgroundで確認する（変更が見えるポイント）
- Step9は複数ファイルなので、右側JSには `// --- file: xxx.js ---` という区切りが入っています。
- たとえば `player.js` の `speed` を変えると、移動速度が変わります。
- `enemies.js` の出現確率を変えると、敵の出方が変わります。
