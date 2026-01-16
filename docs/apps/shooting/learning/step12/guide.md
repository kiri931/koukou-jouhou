# Step12: ライフ＋ゲームオーバー

## このStepでできること
- 敵に当たるとライフが減り、0になるとゲームオーバーになります。
- START画面 / PLAYING / GAMEOVER の状態を切り替えます（Spaceで開始/戻る）。
- 被弾直後は短時間無敵（点滅）になります。

## 前Stepからの差分
- ゲーム状態`state`（START/PLAYING/GAMEOVER）を追加します。
- `life`（ライフ）と`invincibleTimer`（無敵時間）を追加します。
- プレイヤー×敵の当たり判定を追加し、当たったらライフを減らします。
- 画面に`LIFE`を表示し、START/GAMEOVER時はオーバーレイ表示を出します。

## Playgroundで確認する（変更が見えるポイント）
- 右側のJSで`life`の初期値を変えると、耐久回数が変わる。
- `invincibleTimer = 60`を短く/長くすると、無敵時間の長さが変わる。
- `drawOverlay(...)`の文字列を変えると、START/GAMEOVERの表示が変わる。
