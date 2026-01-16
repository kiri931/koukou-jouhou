(() => {
  const STORAGE_KEY = "shooting:learning:theme:v1";

  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  const getEffectiveTheme = (theme) => {
    const t = theme === "light" || theme === "dark" ? theme : "auto";
    if (t === "light" || t === "dark") return t;
    return media && media.matches ? "dark" : "light";
  };

  const applyTheme = (theme) => {
    const t = theme === "light" || theme === "dark" ? theme : "auto";
    if (t === "auto") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = t;
    }

    const effective = getEffectiveTheme(t);
    document.documentElement.dataset.themeEffective = effective;
  };

  const readSaved = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "auto";
    } catch {
      return "auto";
    }
  };

  const save = (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  };

  const init = () => {
    const select = document.getElementById("themeSelect");
    const initial = readSaved();
    applyTheme(initial);

    if (select) {
      select.value = initial === "light" || initial === "dark" ? initial : "auto";
      select.addEventListener("change", () => {
        const v = String(select.value || "auto");
        applyTheme(v);
        save(v);
      });
    }

    if (media) {
      const onMediaChange = () => {
        const current = readSaved();
        if (current === "auto" || current !== "light" && current !== "dark") {
          applyTheme("auto");
        }
      };

      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", onMediaChange);
      } else if (typeof media.addListener === "function") {
        media.addListener(onMediaChange);
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
