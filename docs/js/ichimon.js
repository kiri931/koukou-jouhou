// 互換入口: 旧 /js/ichimon.js を維持しつつ、実体は /assets/js/ichimon.js に集約。
(function () {
  try {
    const current = document.currentScript?.src ? new URL(document.currentScript.src) : new URL(location.href);
    const target = new URL("../assets/js/ichimon.js", current).href;
    const s = document.createElement("script");
    s.defer = true;
    s.src = target;
    document.head.appendChild(s);
  } catch {
    // no-op
  }
})();
