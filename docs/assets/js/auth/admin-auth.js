// /assets/js/auth/admin-auth.js
// 既存 /docs/e-net の簡易認証（sessionStorage: "e-net-auth"）を踏襲し、admin保護に転用する。

export const ENET_SESSION_KEY = "e-net-auth";
const META_KEY = "admin-auth-meta";

export function getAuthEmail() {
  return sessionStorage.getItem(ENET_SESSION_KEY);
}

export function getAuthMeta() {
  const raw = sessionStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(email, provider = "simple") {
  sessionStorage.setItem(ENET_SESSION_KEY, email);
  sessionStorage.setItem(
    META_KEY,
    JSON.stringify({ provider, email, ts: Date.now() })
  );
}

export function clearAuthSession() {
  sessionStorage.removeItem(ENET_SESSION_KEY);
  sessionStorage.removeItem(META_KEY);
}

export function isAdminAuthenticated() {
  return !!getAuthEmail();
}

export function getReturnToFromLocation() {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function getSiteBasePath() {
  // GitHub Pages (project pages) の場合は `/<repo>` が先頭に付く。
  // カスタムドメインやローカルでは空にして、従来のルート相対を維持する。
  try {
    const host = location.hostname || "";
    if (!host.endsWith(".github.io")) return "";

    const seg = (location.pathname || "").split("/")[1];
    return seg ? `/${seg}` : "";
  } catch {
    return "";
  }
}

export function withSiteBase(path) {
  if (typeof path !== "string") return path;
  if (!path.startsWith("/")) return path;

  const base = getSiteBasePath();
  if (!base) return path;
  if (path.startsWith(base + "/") || path === base) return path;
  return base + path;
}

export function buildLoginUrl(returnTo = getReturnToFromLocation()) {
  const base = withSiteBase("/auth/login.html");
  const params = new URLSearchParams();

  // returnTo も GitHub Pages の base を考慮
  const normalizedReturnTo = typeof returnTo === "string" && returnTo.startsWith("/")
    ? withSiteBase(returnTo)
    : returnTo;

  params.set("returnTo", normalizedReturnTo);
  return `${base}?${params.toString()}`;
}

export function redirectToLogin(returnTo) {
  location.href = buildLoginUrl(returnTo);
}
