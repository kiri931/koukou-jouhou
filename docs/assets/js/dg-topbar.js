(() => {
  const STORAGE_KEY = "dg-theme";

  function supportsDigital() {
    return Boolean(
      document.querySelector(
        'link[rel="stylesheet"][href*="assets/css/digital.css"], link[rel="stylesheet"][href*="assets/css/sekigae-digital.css"]'
      )
    );
  }

  function computeHomeHref() {
    // Derive site base from resolved stylesheet URL like:
    //   /assets/css/digital.css           -> base: /
    //   /<repo>/assets/css/digital.css    -> base: /<repo>/
    const link = document.querySelector(
      'link[rel="stylesheet"][href*="assets/css/digital.css"], link[rel="stylesheet"][href*="assets/css/sekigae-digital.css"]'
    );
    if (!link) return "/";

    try {
      const resolved = new URL(link.getAttribute("href") || "", location.href);
      const idx = resolved.pathname.indexOf("/assets/");
      if (idx <= 0) return "/";
      return resolved.pathname.slice(0, idx + 1);
    } catch {
      return "/";
    }
  }

  function getThemeSetting() {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
    return "system";
  }

  function applyTheme(setting) {
    if (setting === "light" || setting === "dark") {
      document.documentElement.setAttribute("data-theme", setting);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function themeLabel(setting) {
    if (setting === "light") return "ライト";
    if (setting === "dark") return "ダーク";
    return "自動";
  }

  function nextTheme(setting) {
    if (setting === "system") return "light";
    if (setting === "light") return "dark";
    return "system";
  }

  function ensureActionsContainer(headerInner) {
    let actions = headerInner.querySelector(".dg-topbar__actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "dg-topbar__actions";
      headerInner.appendChild(actions);
    }
    return actions;
  }

  function ensureHeader() {
    // If page already has a dg-header, augment it.
    let header = document.querySelector("header.dg-header");
    if (!header) {
      header = document.createElement("header");
      header.className = "dg-header dg-topbar";
      header.innerHTML = `
        <div class="dg-container dg-header__inner">
          <a class="dg-brand" href="/">
            <span class="dg-brand__title">高校情報</span>
            <span class="dg-brand__badge">Top</span>
          </a>
        </div>
      `.trim();
      document.body.prepend(header);
    } else {
      header.classList.add("dg-topbar");
    }

    const inner = header.querySelector(".dg-header__inner") || header;
    const actions = ensureActionsContainer(inner);

    if (!actions.querySelector(".dg-topbar__home")) {
      const home = document.createElement("a");
      home.className = "dg-btn dg-btn--subtle dg-topbar__home";
      home.href = computeHomeHref();
      home.textContent = "トップへ";
      actions.appendChild(home);
    }

    if (!actions.querySelector("#dgThemeToggle")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "dgThemeToggle";
      btn.className = "dg-btn dg-btn--subtle";
      btn.addEventListener("click", () => {
        const current = getThemeSetting();
        const next = nextTheme(current);
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
        btn.textContent = `テーマ: ${themeLabel(next)}`;
      });
      const current = getThemeSetting();
      btn.textContent = `テーマ: ${themeLabel(current)}`;
      actions.appendChild(btn);
    }
  }

  // Always apply stored theme as early as possible.
  try {
    applyTheme(getThemeSetting());
  } catch {
    // ignore (e.g., storage blocked)
  }

  // Only inject/augment UI on pages that use digital.css.
  // (Theme application above is harmless even if not.)
  if (!supportsDigital()) return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureHeader, { once: true });
  } else {
    ensureHeader();
  }
})();
