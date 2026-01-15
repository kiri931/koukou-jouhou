import { setAuthSession, clearAuthSession, withSiteBase } from "../assets/js/auth/admin-auth.js";

const DEFAULT_PASSCODE = "admin";
const ENET_DOMAIN = "e-net.nara.jp";

function $(id) {
  return document.getElementById(id);
}

function getReturnTo() {
  const params = new URLSearchParams(location.search);
  const returnTo = params.get("returnTo");
  const fallback = withSiteBase("/apps/kentei/joho-gijutsukentei/admin/");
  if (!returnTo) return fallback;
  if (!returnTo.startsWith("/")) return fallback;
  return withSiteBase(returnTo);
}

function redirect(returnTo) {
  location.href = returnTo;
}

function setBadge(el, text, variant) {
  el.style.display = "inline-flex";
  el.textContent = text;
  el.classList.remove("dg-badge--ok", "dg-badge--ng");
  if (variant === "ok") el.classList.add("dg-badge--ok");
  if (variant === "ng") el.classList.add("dg-badge--ng");
}

const returnTo = getReturnTo();
$("returnTo").textContent = returnTo;

// (a) 合言葉
$("passcodeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const passcode = $("passcode").value;
  if (passcode === DEFAULT_PASSCODE) {
    setAuthSession("admin", "passcode");
    setBadge($("passcodeStatus"), "OK", "ok");
    redirect(returnTo);
  } else {
    setBadge($("passcodeStatus"), "NG", "ng");
  }
});

// (b) 既存 e-net 方式（GSI）を踏襲：JWT内の email とドメインで判定
// - 既存 /docs/e-net/index.html と同様に sessionStorage("e-net-auth") を利用
window.handleEnetLogin = function handleEnetLogin(response) {
  let data = null;

  try {
    data = JSON.parse(atob(response.credential.split(".")[1]));
  } catch {
    alert("このアカウントではログインできません。（メール情報なし）");
    return;
  }

  const email = data.email;
  if (!email) {
    alert("このアカウントではログインできません。（メールが取得できません）");
    return;
  }

  const domain = email.split("@")[1];
  if (domain === ENET_DOMAIN) {
    setAuthSession(email, "enet-gsi");
    redirect(returnTo);
    return;
  }

  alert(`このサイトは ${ENET_DOMAIN} のアカウント専用です。`);
};

// ログアウト
$("logout").addEventListener("click", () => {
  clearAuthSession();
  setBadge($("logoutStatus"), "ログアウトしました", "ok");
});

// (c) Firebase（任意）
(async () => {
  const btn = $("firebaseLogin");
  const status = $("firebaseStatus");

  // firebase-config.js が無ければ import が失敗する想定
  try {
    const mod = await import("./firebase-auth.js");
    const firebase = await mod.initFirebase();

    status.textContent = "利用可能";
    btn.disabled = false;

    btn.addEventListener("click", async () => {
      try {
        const user = await firebase.signInWithGoogle();
        const email = user?.email || "firebase-user";
        setAuthSession(email, "firebase-google");
        status.textContent = "ログイン成功";
        status.classList.add("dg-badge--ok");
        redirect(returnTo);
      } catch (e) {
        console.error(e);
        status.textContent = "ログイン失敗";
        status.classList.add("dg-badge--ng");
      }
    });
  } catch (e) {
    btn.disabled = true;
    status.textContent = "未設定";
  }
})();
