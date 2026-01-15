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

1. 簡易認証（合言葉）
   - 実装: `../../auth/login.js`
   - 初期値は `admin`（運用前に変更推奨）
2. e-net Googleログイン（既存踏襲）
   - `@e-net.nara.jp` ドメインのみ許可
   - 既存 `../../e-net/index.html` のロジックと同様に JWT から email を取得
3. Firebase Auth（Googleログイン）※任意
   - `/auth/firebase-config.example.js` を `/auth/firebase-config.js` にコピーして設定
   - `firebase-config.js` が無い場合、UIは自動で「未設定」表示になります

## PDF.js

- `vendor/pdfjs/viewer.html` は iframe で `viewer.html?file=...&page=...` 形式で開けるようにしています。
- 現状は **CDN版 PDF.js** を利用する簡易viewerです。
- pdfjs-dist の配布物へ置換したい場合は `vendor/pdfjs/README.md` を参照してください。

## AIによる出題範囲の分析

情報技術検定3級の出題範囲は、大きく分けて**「ハードウェアとソフトウェアの基礎知識」「数値の表現と論理回路」「流れ図（アルゴリズム）」「プログラミング」**の4つの分野で構成されています。各分野の詳細は以下の通りです。

### 1. ハードウェアとソフトウェアの基礎知識（大問1）

コンピュータを構成する基本的な要素や、情報社会で必要とされる用語の知識が問われます。

- **コンピュータの五大装置**: 制御装置、演算装置、記憶装置（主記憶・補助記憶）、入力装置、出力装置の役割とデータの流れ。
- **ハードウェア**: スキャナ、プロジェクタ、プリンタ、デジタイザなどの周辺機器の名称と機能。
- **ソフトウェア**: オペレーティングシステム（OS）の機能、表計算やCAD、プレゼンテーションなどのアプリケーションソフトウェアの用途。
- **マルチメディアと通信**:
  - ファイル形式: 静止画（JPEG）、動画（AVI, MPEG2）、音声（MP3）、演奏情報（MIDI）などの規格。
  - A/D変換: アナログ信号をデジタル信号に変換する過程（標本化、量子化、符号化）の理解。
  - ネットワーク: 通信機器（ルーター、ハブ）、通信プロトコル（HTTP, SMTP, POP3, FTP）、用語（IoT, URL, DNS）などの基礎知識。
  - 情報セキュリティ: コンピュータウイルス、パスワード管理、ログ、ファイアウォールなどの用語。

### 2. 数値の表現と論理回路（大問2）

コンピュータ内部での情報処理の仕組みについて、計算技能を含めて問われます。

- **進数変換**: 10進数、2進数、16進数の相互変換（整数および小数を含む）。
- **2進数の演算**: 2進数による加算、減算、乗算。
- **符号付き数値**: 2の補数を用いた負の数の表現方法。
- **データ単位**: ビット(bit)、バイト(Byte)、BCDコード（2進化10進数）の理解。
- **論理回路**: AND、OR、NOT、NAND、NOR、XOR（排他的論理和）の各回路における論理記号、論理式、および真理値表の完成。

### 3. アルゴリズムと流れ図（大問3～5）

プログラムの論理構造を理解し、流れ図（フローチャート）を完成させる能力が問われます。

- **基本記号**: 端子、処理（長方形）、判断（ひし形）、ループ（台形）、入出力（平行四辺形）の判別。
- **典型的な処理パターン**:
  - 算術計算: 合計(SUM)、平均(AVG)、最大・最小値の抽出。
  - 条件判定: 数値の比較（A > B）、範囲判定（点数による成績判定）、料金計算（重量や時間による算出）。
  - 繰り返し: カウンタ変数を用いた指定回数のループ、条件を満たすまでの反復処理。
  - 配列処理: 配列に格納されたデータの集計、探索、並べ替え（ソート）、グラフ出力。

### 4. プログラミング（大問6～9）

C言語またはJIS Full BASICのいずれか一方を選択し、プログラムコードの空欄を埋める形式です。

- **変数の代入と演算**: 変数への値の格納、基本的な四則演算。
- **制御構造**:
  - 選択（分岐）: if文やIF...THEN...ELSEを用いた条件分岐。
  - 反復（ループ）: for文やwhile文（C言語）、FOR...NEXTやDO WHILE（BASIC）を用いた繰り返し処理。
- **組み込み関数**: 余りを求める演算（C言語の%、BASICのMOD）、整数化（INT）、平方根（sqrt/SQR）などの利用。
- **入出力関数**: printf, scanf（C言語）およびPRINT, INPUT（BASIC）による画面出力とデータ入力。
- **数学的な題材**: 消費税計算、三角形の面積、BMIの算出、倍数のカウント、コラッツ予想などのアルゴリズム実装。