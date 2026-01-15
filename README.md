# koukou-jouhou

高校「情報」向けの教材・資料・ツールをまとめた **静的サイト** です。

- 公開サイトの実体は `docs/` 配下（GitHub Pages想定）
- ビルド無しで動作（HTML/CSS/JSのみ）

## 公開サイトの構造（`docs/`）

GitHub Pages では通常 `docs/` がサイトルートになります（設定により変わります）。

```
docs/
	index.html                ... サイトトップ
	apps/                     ... アプリ置き場
		kentei/                 ... 検定/学習アプリ
		sekigae/                ... 席替えアプリ（iOS配信の紹介/サポートページ）
		tools/                  ... 小ツール集
		QR/                     ... QR関連
	lessons/                  ... 教材/授業コンテンツ置き場
		class/                  ... クラス/行事など授業運用
		html/                   ... 教材ページ（HTML/C/Swift等）
	assets/
		css/                    ... 共通CSS/各ページCSS
		js/
			admin-auth-guard.js   ... adminページ用ガード（未認証ならログインへ誘導）
			auth/
				admin-auth.js       ... sessionStorage("e-net-auth") を使う簡易セッション
	js/
		analytics.js            ... アクセス解析（任意）

	auth/
		login.html              ... 共通ログインページ（adminのみここへ誘導）
		login.js                ... ログイン処理（合言葉 / e-net / Firebase(任意)）

	e-net/
		index.html              ... e-net用ログイン（既存導線）
		auth.js                 ... e-net用ガード（未ログインならログインへ誘導）
		home.html               ... e-net専用ページ（例）

	md/                       ... 学習用ドキュメント（Markdown）
```

## 主要ドキュメント

- 検定サイト（情技検3級）: [docs/apps/kentei/joho-gijutsukentei/README.md](docs/apps/kentei/joho-gijutsukentei/README.md)
- PDF viewer: [docs/apps/kentei/joho-gijutsukentei/vendor/pdfjs/README.md](docs/apps/kentei/joho-gijutsukentei/vendor/pdfjs/README.md)

## ローカルでの確認

VS Code の Live Server 等で `docs/` を静的配信して確認します。

## 注意（公開運用）

- 文章・問題・図表などは **転載リスク** が出ないよう、原則として自作/要約を前提にしてください。
- `/admin/` は運用上のゲート（クライアント側のみ）なので、強い機密情報は置かない方針が安全です。

