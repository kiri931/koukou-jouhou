# 分野別演習 (Practice Mode)

情報技術検定3級の分野別演習システムです。

## データ構成

合計 **290問** の問題を4つのJSONファイルで管理しています。

| ファイル | 問題数 | 内容 |
|---------|--------|------|
| `data/practice/mondai1.json` | 130問 | 基本用語（コンパイラ、プロトコル、著作権など） |
| `data/practice/mondai2.json` | 100問 | 計算・論理回路 |
| `data/practice/mondai3.json` | 30問 | フローチャート問題（穴埋め形式） |
| `data/practice/mondai4.json` | 30問 | プログラミング問題（C言語・BASIC） |

## 機能

### 1. 分野別学習（4分野）
- 基本用語
- 計算・論理回路
- フローチャート
- プログラミング

### 2. 出題
- 分野を選んで開始すると、その分野から約10問をランダムに出題

### 3. 問題形式
- **選択式（choice）**: 4択問題、自動採点対応
- **フローチャート（flowchart）**: 穴埋め問題、解答表示のみ
- **プログラミング（programming）**: コード穴埋め、C言語/BASIC切替可能

## ファイル構造

```
practice/
├── index.html              # メインHTML
├── practice.js             # メインロジック
├── practice-loader.js      # データ読み込み
├── practice-engine.js      # レンダリング・採点
└── README.md              # このファイル
```

## 各JSONファイルの構造

### data/practice/mondai1.json（基本用語）
```json
{
  "id": 1,
  "question": "問題文",
  "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "answer": "正解の選択肢"
}
```

### data/practice/mondai2.json（計算・論理回路）
```json
{
  "id": 1,
  "question": "問題文",
  "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "answer": "正解の選択肢"
}
```

### data/practice/mondai3.json（フローチャート）
```json
{
  "id": 1,
  "category": "基本計算",
  "title": "タイトル",
  "description": "説明文",
  "flow_steps": [
    { "label": "開始", "shape": "terminal" },
    { "label": "条件", "shape": "decision", "blank_id": 1 }
  ],
  "choices": ["ア. 選択肢1", "イ. 選択肢2"],
  "answers": { "1": "ア", "2": "イ" }
}
```

### data/practice/mondai4.json（プログラミング）
```json
{
  "id": 1,
  "title": "タイトル",
  "description": "説明文",
  "program_c": ["コード行1", "コード行2"],
  "program_basic": ["コード行1", "コード行2"],
  "choices": ["ア. 選択肢1", "イ. 選択肢2"],
  "answers": { "1": "ア", "2": "イ" }
}
```

## 今後の拡張可能性

- [ ] 学習履歴の保存（localStorage）
- [ ] 正答率の表示
- [ ] 苦手分野の分析
- [ ] お気に入り機能
- [ ] 間違えた問題だけ復習
- [ ] タイマー機能

## 注意事項

- フローチャートとプログラミング問題は自動採点に対応していません
- 選択肢から適切なものを選んで、解説で正解を確認してください
- 認証は不要で、誰でも自由に利用できます

## 開発者向け

### 問題の追加方法

1. 該当するJSONファイルに問題を追加
2. IDは連番で管理（重複チェック済み）
3. `practice-loader.js` が自動的に読み込みます


注: 分野（4分野）は固定です。追加・変更したい場合は
`practice-loader.js` の section 名と読み込み対象を合わせて修正してください。

---

最終更新: 2026-01-15
