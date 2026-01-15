# PDF viewer（簡易）

このフォルダは、iframe でPDFを表示するための **簡易viewer** を同梱しています。

- `viewer.html?file=...&page=...` 形式で開ける想定
- 上位ページ側の使い方は [../README.md](../README.md) を参照

## 公式pdfjs-distへの置換

要件が「pdfjs-dist（配布物）の同梱」に寄る場合は、ここを pdfjs-dist の `web/viewer.html` に置き換えても構いません。
その場合でも、上位のページは iframe で `viewer.html?file=...&page=...` を開く想定のままにできます。

## 注意

- PDFが別オリジンの場合は CORS により表示できないことがあります。
- 同一オリジン（同じサイト配下）のPDFを指定する運用が安全です。
