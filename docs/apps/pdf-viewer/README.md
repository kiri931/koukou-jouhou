# PDF参照モード

PDFを表示しながら、回答UIで解答できるアプリケーションです。

## 機能

- PDF一覧の表示
- PDFビューアーでの閲覧（ページジャンプ機能付き）
- 範囲（スコープ）別の問題表示
- 回答入力
- 回答データのCSVエクスポート

## ファイル構成

```
pdf-viewer/
├── index.html       # メインページ
├── app.js           # アプリケーションロジック（単体動作、依存なし）
├── viewer.html      # PDFビューアー
├── data/
│   ├── pdf_list.json    # PDF一覧データ
│   └── pdf_ref.json     # PDF参照問題データ
└── README.md
```

## データ形式

### pdf_list.json

```json
[
  {
    "id": "kekka-64",
    "title": "第64回 情報技術検定（結果）",
    "path": "https://example.com/path/to/pdf",
    "note": "説明文",
    "scopes": [
      {
        "id": "g3",
        "label": "3級",
        "questionCount": 50,
        "pageFrom": 1,
        "pageTo": 10,
        "note": "範囲のメモ"
      }
    ]
  }
]
```

### pdf_ref.json

```json
[
  {
    "id": "it3-pdf-ref-0001",
    "grade": 3,
    "section": "society",
    "format": "text",
    "stem": "問題の簡易説明",
    "answer_text": "",
    "explanation": "",
    "tags": ["pdf"],
    "difficulty": 1,
    "source": {
      "type": "pdf",
      "pdfId": "kekka-64",
      "page": 1,
      "label": "問1"
    }
  }
]
```

## 使い方

1. `data/pdf_list.json`にPDF情報を追加
2. （任意）`data/pdf_ref.json`に問題データを追加
3. `index.html`を開く
4. PDF一覧から対象のPDFを選択
5. 問題を解いて回答を入力
6. 「回答CSVを出力」ボタンでCSVをダウンロード

## 注意事項

- 外部PDFを表示する場合、CORS制限により表示できない場合があります
- 問題データがない場合は、プレースホルダーの問題が自動生成されます
- CSVファイル名: `pdf-{pdfId}-{scopeId}-{日付}.csv`

## 更新履歴

- 2026-01-30: 単体動作版として作成
