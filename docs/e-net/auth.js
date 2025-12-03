// =============================
// e-net 認証チェック 共通スクリプト
// =============================

// 現在のページのパスを取得
const path = location.pathname;

// ログインページ(index.html)は除外
const isLoginPage = path.endsWith("/e-net/") || path.endsWith("/index.html");

// 認証情報の取得
const email = sessionStorage.getItem("e-net-auth");

// ログインしていない場合
if (!email && !isLoginPage) {
  // 強制的にログインページへ
  location.href = "/e-net/index.html";
}
