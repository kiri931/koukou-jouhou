// 互換入口: 旧 /e-net/auth.js を維持しつつ、実体は /assets/js/e-net/auth.js に集約。
(function () {
  try {
    const current = document.currentScript?.src ? new URL(document.currentScript.src) : new URL(location.href);
    const target = new URL("../assets/js/e-net/auth.js", current).href;
    const s = document.createElement("script");
    s.src = target;
    s.onerror = () => { };
    document.head.appendChild(s);
  } catch {
    // no-op
  }
})();
