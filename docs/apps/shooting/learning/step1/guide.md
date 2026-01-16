# Step1: Canvasを表示する

## このStepでできること
- HTMLの`<canvas>`を使って、ゲーム画面の土台を作ります。
- JavaScriptでCanvasの描画コンテキスト（2D）を取得して、まずは「描ける状態」にします。

## プログラムの説明（Step1のコード）
- `const canvas = document.getElementById("gameCanvas")` でCanvas要素を取得します。
- `const ctx = canvas.getContext("2d")` で2D描画用の`ctx`を作ります。
- この時点では「表示されているだけ」で、まだ自機や背景は描きません。

## Playgroundで確認する（変更が見えるポイント）
- 右側（自分の実行）のHTMLで、`<canvas>`の`width`/`height`を変えてみる（例: `480x640` → `320x480`）。
- 右側のCSSで、Canvasの枠線などを付けてみる（例: `canvas { border: 1px solid; }`）。
