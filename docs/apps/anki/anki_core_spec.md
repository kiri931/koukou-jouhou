# 覚える君 仕様書（Web版 → iOS移行前提）

- 版：v0.2（推奨反映版）
- 作成日：2026-01-16

## 0. 要約
本仕様書は「一問一答カード」を中心に、**短答入力（想起練習）× 分散復習（スケジューラ）× 混在出題（interleaving）**を核として、様々な分野・問題セットに対応できる“覚える君”をWeb（静的ホスティング）で実装するための要件を定義する。

- **バックエンド無し**で成立（ローカル保存・オフライン可）
- 教材カード：**JSON**（データセット単位）
- 学習進捗：**IndexedDB**（大量の構造化データ向け）
- UI：**デジタル庁デザインシステム（HTML版コードスニペット）**を参考に実装

---

## 1. 背景と設計方針（エビデンス）
本プロダクトのコアは、学習科学で効果が強いとされる以下を**プロダクト機能として強制・支援**すること。

- **Practice testing（想起練習 / テスト効果）**：思い出して答える行為自体が長期保持を強化する。
- **Distributed practice（分散学習 / 間隔効果）**：復習を時間的に分散すると、同じ総学習量でも保持が良くなる。
- **Interleaving（交互学習 / 混在出題）**：カテゴリや類似項目を適度に混ぜると識別・転移が向上する場合が多い。
- **“できた気”対策**：直後の出来（performance）より、翌日以降の再テスト（learning）指標を重視する。

### 1.1 本アプリでの落とし込み
- 出題は **短答（入力）** を基本（選択式は補助/後回しでOK）。
- 誤答時フィードバック：**「何が違うか」1行**を必ず提示（例：正解/入力、表記差、単位差、符号差）。
- 低負荷でも回る：**毎日5〜10分**で「今日の復習→終了」できる導線を最優先。
- 混ぜる・取り違え対策：タグ/カテゴリで**適度に混在**し、誤答直後は**類似カードを近接**出題して混同を潰す。

---

## 2. 用語
- **カード（Card）**：1問1答の最小学習単位。
- **データセット（Dataset）**：特定テーマのカード集合（例：計算技術検定、IT用語）。
- **レビュー（Review）**：カードに回答し、正誤・自己評価などのログを残すイベント。
- **レーティング（Rating）**：自己評価（Hard/Good/Easy）を内部段階値に変換したもの。
- **スケジューラ（Scheduler）**：次回出題タイミングを決めるアルゴリズム。
- **保持確率（Retrievability）**：今この瞬間に思い出せる確率の推定値。
- **試験日（Exam date）**：目標日。直前ほど目標保持率を引き上げる。

---

## 3. スコープ
### 3.1 ゴール（MVP）
- カード方式（一問一答）：質問→回答入力→正誤→自己評価→次へ。
- 解説表示（ボトムシート）：必要なときだけ開く。
- データセット（JSON）インポート／エクスポート。
- 学習進捗の永続化（IndexedDB）。
- スケジューリング：入力（正誤・自己評価・反応時間）から、一定の保持率を狙って復習間隔を算出。
- 混在出題（interleaving）＋取り違え対策。
- ダッシュボード：
  - 期限切れ枚数（Overdue）
  - 保持確率（推定）
  - 取り違えランキング
  - 試験日までの必要レビュー量予測（簡易）

### 3.2 非ゴール（v0.2ではやらない）
- アカウント作成・サーバー同期（ユーザー主導のバックアップ/復元で代替）
- 生成AIによる作問機能
- 選択式問題の最適化（短答がコア）

---

## 4. 全体アーキテクチャ（バックエンド無し）
### 4.1 実行形態
- 静的ホスティング（GitHub Pages / Cloudflare Pages 等）
- PWA（Service Workerでアプリシェルをキャッシュしオフライン動作）

### 4.2 データ保存
- 教材（カード群）：JSONファイルとして配布/編集可能
- 進捗（レビュー履歴・状態）：IndexedDBに保存
- ストレージ消去対策：可能なら `navigator.storage.persist()` を呼び出して永続化をリクエスト

### 4.3 バックエンド無し同期（推奨）
- **推奨（最初に実装）**：
  - 進捗バックアップ（JSON）をエクスポート
  - iCloud Drive / Google Drive / USB等でユーザーが移動
  - インポートで復元
- **任意（対応ブラウザ限定）**：File System Access APIで「同一ファイルへ上書き保存」を実現（互換性に注意）

---

## 5. データ仕様
### 5.1 教材データ（Dataset JSON v1）
- 文字コード：UTF-8
- ファイル：`dataset.json`

#### 5.1.1 JSON例
```json
{
  "schema": "memory-dataset/v1",
  "datasetId": "9e4e0a84-1cde-4c71-b6ad-6a1b3bbce5d3",
  "title": "計算技術検定3級 四則計算",
  "description": "四則計算の一問一答カード",
  "tags": ["math", "kentei"],
  "cards": [
    {
      "id": "5f4c4d66-7c47-4c1f-9f6d-2b4b12f4a1a2",
      "topic": "四則計算",
      "question": "12 \\times (8 + 5) \\div 3",
      "answers": ["52"],
      "explanation": "まず(8+5)=13。次に 12×13=156。最後に 156÷3=52。",
      "tags": ["parentheses", "division"],
      "createdAt": "2026-01-16T00:00:00.000Z",
      "updatedAt": "2026-01-16T00:00:00.000Z"
    }
  ]
}
```

#### 5.1.2 フィールド定義
- dataset
  - `schema`：固定 `memory-dataset/v1`
  - `datasetId`：UUID v4
  - `title` / `description`：UI表示用
  - `tags[]`：任意
  - `cards[]`：カード配列
- card
  - `id`：UUID v4
  - `topic`：分野（お題）
  - `question`：質問（将来TeXレンダリング対応予定）
  - `answers[]`：正答文字列（複数可：別表記/同義語）
  - `explanation`：解説（任意）
  - `tags[]`：混在出題・分析用

### 5.2 学習進捗（IndexedDB）
#### 5.2.1 DB構成（例）
- DB名：`memory_app_db`
- object stores：
  - `datasets`：datasetメタ（title等、インポート日時、hash）
  - `cards`：カード本体（datasetId, cardId）
  - `cardState`：スケジューラ状態（S,D,lastReviewAt,dueAt,lapses,reps等）
  - `reviews`：レビュー履歴（append-only）
  - `confusions`：取り違えペア（cardA, cardB, score）
  - `settings`：examDateや表示設定

#### 5.2.2 cardState例
```json
{
  "datasetId": "...",
  "cardId": "...",
  "stability": 2.4,
  "difficulty": 5.0,
  "dueAt": "2026-01-20T00:00:00.000Z",
  "lastReviewAt": "2026-01-16T01:23:45.000Z",
  "lapses": 0,
  "reps": 3,
  "lastRating": 3,
  "lastResponseMs": 4200
}
```

### 5.3 互換性・マイグレーション
- JSONは `schema` を持ち、将来的に変換可能にする。
- IndexedDBはバージョニングでマイグレーション。

---

## 6. 画面仕様（情報設計とUI）
### 6.1 画面一覧
1. ホーム（データセット選択／今日の復習）
2. 学習セッション（出題・入力・判定・評価）
3. 解説ボトムシート
4. ダッシュボード
5. データ管理（インポート/エクスポート/バックアップ）
6. カード編集（CRUD）
7. 設定

### 6.2 学習セッション（コア体験）
#### 6.2.1 表（Front）
- 質問を表示
- 回答入力欄（テキスト）
- ボタン：
  - **回答する**（採点へ）
  - **わからない**（正解表示へ。レーティングはAgain相当）

#### 6.2.2 採点後（Back）
- 正誤表示（成功/失敗）
- 「何が違うか」1行
- 正解（答え）
- ボタン：
  - **Hard / Good / Easy**（正答時のみ表示でも可）
  - **解説**（ボトムシート）
  - **次へ**（評価後は自動でも可）

#### 6.2.3 解説ボトムシート
- 初期は閉
- 「解説」ボタンで下からスライド
- 内容はプレーンテキスト（将来Markdown）

### 6.3 ダッシュボード（要こだわり）
- 今日の復習：期限切れ/本日分/新規上限
- 保持確率：平均・分布・下位カード
- 取り違えランキング：ペア上位
- 試験日予測：日別の必要レビュー量（簡易シミュレーション）

---

## 7. 回答判定（短答の体験品質）
### 7.1 正誤判定（推奨）
1) 入力と正答候補を正規化して比較
- Unicode正規化（NFKC）
- trim（前後空白除去）
- 連続空白の圧縮
- 大文字小文字の統一（必要なら）

2) `answers[]` のどれかに一致したら正解

### 7.2 誤答時「何が違うか」1行（推奨ルール）
- 基本：`正解: <expected> / 入力: <actual>`
- 近い場合（編集距離が小さい等）：`表記が近いですが一致しません（記号・単位・スペースなどを確認）`
- もう一つのカードの答えに一致した場合：`別の問題の答えと混同している可能性があります（取り違え候補: ...）`

---

## 8. スケジューラ仕様（正答率を一定に保つ）
### 8.1 採用方針
- **FSRS（Free Spaced Repetition Scheduler）**の考え方に沿い、
  - Stability（S）
  - Difficulty（D）
  - Retrievability（R）
 で状態を表し、目標保持率 `r` から次の間隔を計算する。
- v0.2では「学習者ごとの最適化（パラメータ学習）」はしない。まずは **デフォルトパラメータ**で運用し、後から改善できる設計にする。

### 8.2 入力データ
- 正誤（correct: bool）
- 自己評価（Hard/Good/Easy）
- 反応時間（ms）

### 8.3 内部レーティング
- internal `G` を1〜4で表す（Anki相当）：
  - 1: Again（誤答/わからない）
  - 2: Hard
  - 3: Good
  - 4: Easy

### 8.4 状態変数（cardState）
- `S`：stability（日）。Rが100%→90%へ落ちるまでの目安。
- `D`：difficulty（1〜10）。高いほど伸びにくい。
- `lastReviewAt` / `dueAt` / `lapses` / `reps`

### 8.5 忘却曲線と間隔（FSRS v4の式）
- 経過日数 `t`、安定度 `S` のときの保持確率推定：

`R(t, S) = (1 + t / (9 * S))^{-1}`

- 目標保持率 `r` を満たす次回間隔：

`I(r, S) = 9 * S * (1/r - 1)`

### 8.6 既定パラメータ（FSRS v4 default）
`w = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]`

### 8.7 更新ルール（FSRS v4ベース）
- 初回レビュー：
  - `S0(G) = w[G-1]`
  - `D0(G) = w[4] - (G - 3) * w[5]`
- 難易度更新（平均回帰＋クランプ）：
  - `D' = w[7] * D0(3) + (1 - w[7]) * (D - w[6] * (G - 3))`
  - `D'`は[1,10]にクランプ
- 正答時（G=2/3/4）の安定度更新：
  - まず `R = R(t,S)`
  - `S' = S * (exp(w[8]) * (11 - D) * S^{-w[9]} * (exp(w[10] * (1 - R)) - 1) * (w[15] if G==2 else 1) * (w[16] if G==4 else 1) + 1)`
- 誤答時（G=1）の安定度更新：
  - `S' = w[11] * D^{-w[12]} * ((S + 1)^{w[13]} - 1) * exp(w[14] * (1 - R))`

> 実装では、`S`は下限（例：0.1日）を持たせる。

### 8.8 反応時間補正（推奨）
- 目的：遅い想起（苦しい想起）を「難しい」と扱い、復習間隔を詰める
- ルール：
  - 統計が溜まるまで（例：30件）は補正しない
  - 正答でも `responseMs` が「そのカードの移動平均×係数」より大きい場合、`G`を1段下げる
    - Easy→Good、Good→Hard（Hard以下には下げない）

### 8.9 目標保持率 r と試験日
- 通常（試験日未設定）：`r = 0.85`（設定で変更可）
- 試験日あり：残日数に応じて r を引き上げる（推奨デフォルト）
  - 残り >30日：0.85
  - 30〜15日：0.90
  - 14〜4日：0.93
  - 3日〜当日：0.96
- さらに、試験日直前に必ず再点検できるよう、次回間隔を `examDate - 1日` を越えないようにクリップする。

---

## 9. 混在出題と取り違え対策
### 9.1 interleaving（混在）
- 同じ `topic` / `tags` が連続しないよう、キューを軽くシャッフル
- オーバーデュー（期限切れ）ほど優先度を上げる

### 9.2 取り違え検出（推奨）
- 誤答入力が、別カードの `answers[]` に一致した場合：
  - その2枚を「取り違えペア」として記録（score++）
- ダッシュボードの「取り違えランキング」に反映
- 誤答直後：取り違え上位ペアを近接出題（混同を潰す）

---

## 10. ダッシュボード仕様
### 10.1 指標
- **期限切れ枚数**：dueAt < now
- **保持確率（推定）**：各カードの `R(now - lastReviewAt, S)` の平均/分布
- **遅延正答率**：最終レビューが「1日以上前」のレビューのみで正答率を算出（“できた気”対策）
- **取り違えランキング**：confusions上位
- **試験日までの必要レビュー量予測**：
  - 各カードの次回dueを繰り返し前倒し計算（簡易シミュレーション）し、日別件数を算出

### 10.2 表示（推奨レイアウト）
- 上段：今日（Overdue / Today / New）
- 中段：保持確率（ゲージ＋分布）
- 下段：取り違えTop10 / 予測グラフ

---

## 11. オフライン / PWA
- Service Workerでアプリシェルをキャッシュ（App Shell）
- データ（IndexedDB）はネット不要
- 更新時："更新があります"トースト → 再読み込み導線

---

## 12. プライバシーとセキュリティ（推奨）
- 既定：通信なし、ログ収集なし
- 進捗バックアップを外部へ出す場合のみ、任意で暗号化（Web Crypto / AES-GCM + PBKDF2）を提供

---

## 13. iOSアプリ化の道筋
1) Web/PWAとして完成（オフライン・保存・UI）
2) iOS配布が必要なら **Capacitor** でラップ（同じWeb資産を再利用）

---

## 14. テスト計画
- スケジューラの単体テスト：
  - 同じ入力で同じdueが出る（決定性）
  - `R`/`I` が境界条件で破綻しない
- E2E：
  - インポート→学習→終了→再読込で進捗復元

---

## 15. 今後詰めると良い点（次の提案）
- **答えのゆらぎ対策**：許容表記（全角/半角、スペース、単位、同義語）をデータ側で持てるようにする
- **複数データセットの横断学習**：試験日前は関連セットを横断キュー化
- **パラメータ最適化**：学習ログからFSRSパラメータを個人最適化（将来）

---

## 参考リンク
- Dunlosky et al. (2013) Improving Students' Learning With Effective Learning Techniques（総説）
  - https://journals.sagepub.com/doi/10.1177/1529100612453266
- Roediger & Karpicke (2006) Taking Memory Tests Improves Long-Term Retention（テスト効果）
  - https://pubmed.ncbi.nlm.nih.gov/16507066/
- Cepeda et al. (2006) Distributed practice meta-analysis（分散学習メタ分析）
  - https://pubmed.ncbi.nlm.nih.gov/16719566/
- Firth et al. (2021) A systematic review of interleaving（交互学習レビュー）
  - https://bera-journals.onlinelibrary.wiley.com/doi/10.1002/rev3.3266
- FSRS（Wiki: The Algorithm / ABC of FSRS）
  - https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
  - https://github.com/open-spaced-repetition/fsrs4anki/wiki/abc-of-fsrs
- MDN: IndexedDB
  - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- MDN: StorageManager.persist()
  - https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- MDN: File System API
  - https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- MDN: Web Crypto API
  - https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- Capacitor docs
  - https://capacitorjs.com/docs/
- デジタル庁デザインシステム（例コンポーネントHTML）
  - https://github.com/digital-go-jp/design-system-example-components-html
