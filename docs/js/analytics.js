// 互換入口: 旧 /js/analytics.js を維持しつつ、実体は /assets/js/analytics.js に集約。
(function () {
	try {
		const current = document.currentScript?.src ? new URL(document.currentScript.src) : new URL(location.href);
		const target = new URL("../assets/js/analytics.js", current).href;
		const s = document.createElement("script");
		s.async = true;
		s.src = target;
		document.head.appendChild(s);
	} catch {
		// no-op
	}
})();
