// /assets/js/admin-auth-guard.js
// adminページ専用ガード。静的サイトの「運用ゲート」として成立する範囲で保護する。

import { isAdminAuthenticated, redirectToLogin, getReturnToFromLocation } from "./auth/admin-auth.js";

const path = location.pathname;
const isLoginPage = path.endsWith("/auth/login.html");

if (!isLoginPage && !isAdminAuthenticated()) {
  redirectToLogin(getReturnToFromLocation());
}
