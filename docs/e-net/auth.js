// =============================
// e-net 認証チェック 共通スクリプト
// =============================

// 現在のページのパスを取得
const path = location.pathname;

// GitHub Pages の project pages でも動くように、必要なら `/<repo>` を付ける
// 例: /<repo>/e-net/home.html の場合 base = /<repo>
const segs = (path || "").split("/");
const base = segs[1] && segs[2] === "e-net" ? `/${segs[1]}` : "";

// ログインページ(index.html)は除外
const isLoginPage = path.endsWith("/e-net/") || path.endsWith("/index.html");

// 認証情報の取得
const email = sessionStorage.getItem("e-net-auth");

// ログインしていない場合
if (!email && !isLoginPage) {
  // 強制的にログインページへ
  location.href = `${base}/e-net/index.html`;
}
