import { ENET_SESSION_KEY } from "../../../../assets/js/auth/admin-auth.js";

export function renderLoginStatus(el) {
  const email = sessionStorage.getItem(ENET_SESSION_KEY);
  if (email) {
    el.textContent = `ログイン中: ${email}`;
    el.classList.add("dg-badge--ok");
  } else {
    el.textContent = "未ログイン（公開機能は利用可能）";
  }
}
