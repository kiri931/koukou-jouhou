# 情報技術検定（情技検）3級 - 学習/模擬試験（静的サイト）

このディレクトリは **ビルド無しの静的サイト** として動作します（GitHub Pages想定）。

- 公開（認証不要）: 学習/模擬試験/CSV出力/PDF参照
- 保護（認証必須）: `./admin/` 配下のみ

## ページ構成

- `./` … 入口（モード選択）
- `./practice/` … 分野別演習
- `./exam/` … 模擬試験（1回分）+ タイマー + CSV出力
- `./pdf/` … PDF参照モード（PDF表示 + 回答UI + CSV出力）
- `./study/` … 勉強テキスト（Markdown表示）
- `./admin/` … admin（認証必須）
- `../../auth/login.html` … adminログインページ（公開ページだが、adminだけここへ誘導）

## ローカルで動かす

VS Code の Live Server 等で `docs/` を静的配信してください。

- 例: `docs/apps/kentei/joho-gijutsukentei/index.html` を開き、リンクから遷移

## 試験設定の変更（exam_config.json）

ファイル: `data/exam_config.json`

例（初期値）:

```json
{
	"grade": 3,
	"time_limit_minutes": 50,
	"pass_score": 70,
	"sections": [
		{"id":"society","name":"コンピュータと社会","count":10},
		{"id":"logic","name":"数の表現と論理","count":10},
		{"id":"hardware","name":"コンピュータの構成と利用","count":10},
		{"id":"algo","name":"アルゴリズム","count":10},
		{"id":"program","name":"プログラム作成能力(C)","count":10,"language":"C"}
	]
}
```

注意:

- `count` より問題数が少ない場合、画面に警告を出しつつ不足分は出題できません。

## 問題JSONの追加方法

格納場所:

- `data/questions/*.json`

読み込み対象ファイルの一覧:

- `data/questions/index.json`

新しいファイルを追加したら、`index.json` の `files` に追加してください。

### 問題データ仕様（最低限）

```json
{
	"id": "it3-logic-0001",
	"grade": 3,
	"section": "logic",
	"format": "choice",
	"stem": "問題文（自作。数式はTeX可）",
	"choices": ["A","B","C","D"],
	"answer": 2,
	"answer_text": "10",
	"explanation": "解説（TeX可）",
	"tags": ["2進数"],
	"difficulty": 1,
	"language": "C",
	"source": {
		"type": "original",
		"pdfId": "ref-001",
		"page": 12,
		"label": "問3"
	}
}
```

- `format`:
	- `choice`: `choices`（配列）と `answer`（0始まりの正解index）を使う
	- `text` / `number`: `answer_text`（文字列）を使う
- `language` は **プログラム分野のみ** 付ける想定（将来 `"BASIC"` を追加可能）
- `source.type`:
	- `original`: 自作問題
	- `pdf`: PDF参照問題（転載回避のため、`stem` は短くし `source` にメタ情報を持たせる）

## PDFの追加方法（pdf_list.json）

ファイル:

- `data/pdf_list.json`

例:

```json
[
	{"id":"ref-001","title":"参照PDFサンプル","path":"./pdf/sample.pdf","note":"差し替え可"}
]
```

運用手順:

1. PDFファイルを `pdf/` 配下へ置く
2. `pdf_list.json` の `path` を `./pdf/xxx.pdf` にする

PDF参照モードは **PDFを表示し、回答UIを提供するだけ** です（問題文のテキスト転載はしません）。

## admin認証の仕組み（e-net踏襲 + Firebase任意）

### どのページが保護される？

- 保護対象: `./admin/` 配下
- 公開: `/practice/`, `/exam/`, `/pdf/` は認証不要

### ガードの仕組み

adminページには共通で以下を読み込みます:

```html
<script type="module" src="../../assets/js/admin-auth-guard.js"></script>
```

このガードは、未認証ならログインページへリダイレクトします（`returnTo` 付き）。

### 既存e-net認証の踏襲

既存 `../../e-net/auth.js` と同様に、認証状態は **sessionStorage** のキーで保持します。

- キー: `e-net-auth`
- 値: ログインしたメールアドレス、または簡易認証の識別子

### login.html のログイン方法

`../../auth/login.html` には3系統あります:

1) 簡易認証（合言葉）

- 実装: `../../auth/login.js`
- 初期値は `admin`（運用前に変更推奨）

2) e-net Googleログイン（既存踏襲）

- `@e-net.nara.jp` ドメインのみ許可
- 既存 `../../e-net/index.html` のロジックと同様に JWT から email を取得

3) Firebase Auth（Googleログイン）※任意

- `/auth/firebase-config.example.js` を `/auth/firebase-config.js` にコピーして設定
- `firebase-config.js` が無い場合、UIは自動で「未設定」表示になります

## PDF.js

- `vendor/pdfjs/viewer.html` は iframe で `viewer.html?file=...&page=...` 形式で開けるようにしています。
- 現状は **CDN版 PDF.js** を利用する簡易viewerです。
- pdfjs-dist の配布物へ置換したい場合は `vendor/pdfjs/README.md` を参照してください。
