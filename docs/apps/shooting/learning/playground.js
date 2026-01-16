function getStepParam() {
  const url = new URL(window.location.href);
  const step = url.searchParams.get("step") || "step1";

  // 想定外のパスを指定されないように、step1〜step13 のみに制限
  if (!/^step(\d+)$/.test(step)) return "step1";
  const n = Number(step.replace("step", ""));
  if (!Number.isFinite(n) || n < 1 || n > 13) return "step1";
  return step;
}

function setStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripLiveServerInjection(text) {
  // Live Server が .md を HTML 扱いして末尾に注入することがあるため、
  // 目印以降を切り落とす。
  const s = String(text);

  // 以前は「目印以降を全部切り落とす」実装だったが、Live Server の注入が
  // </body> より前に入るケースでは、閉じタグまで消えてしまう。
  // ここでは「目印コメント + 直後の注入スクリプト」だけを除去して、残りは保持する。
  const marker = "<!-- Code injected by live-server -->";
  if (!s.includes(marker)) return s.trimEnd();

  // marker 以降の最初の </script> までを削除（注入スクリプトを想定）
  const out = s.replace(/<!-- Code injected by live-server -->[\s\S]*?<\/script>\s*/g, "");
  return out.trimEnd();
}

function renderInlineMd(text) {
  // インラインコード `...` のみ対応（他はすべてエスケープ済み）
  const escaped = escapeHtml(text);
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderGuideMarkdown(mdText) {
  const lines = String(mdText).replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let inList = false;
  let inCode = false;
  let codeBuf = [];

  const closeList = () => {
    if (!inList) return;
    html += "</ul>";
    inList = false;
  };

  const flushCode = () => {
    if (!inCode) return;
    const code = codeBuf.join("\n");
    html += `<pre><code>${escapeHtml(code)}</code></pre>`;
    codeBuf = [];
    inCode = false;
  };

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.trim().startsWith("```")) {
      closeList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
        codeBuf = [];
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    const mH = line.match(/^(#{1,3})\s+(.*)$/);
    if (mH) {
      closeList();
      const level = mH[1].length;
      const text = mH[2] ?? "";
      // guide内は h3 相当に寄せる（Playground全体の見出し階層を崩さない）
      html += `<h3>${renderInlineMd(text)}</h3>`;
      continue;
    }

    const mLi = line.match(/^\s*-\s+(.*)$/);
    if (mLi) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${renderInlineMd(mLi[1] ?? "")}</li>`;
      continue;
    }

    if (line.trim() === "") {
      closeList();
      continue;
    }

    closeList();
    html += `<p>${renderInlineMd(line)}</p>`;
  }

  closeList();
  flushCode();
  return html;
}

const STORAGE_PREFIX = "shooting:learning:playground:v1";
const EXPORT_NAME_STORAGE_KEY = "shooting:learning:playground:exportName:v1";

function getStepStorageKey(step) {
  return `${STORAGE_PREFIX}:${step}`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatDateTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (!Number.isFinite(d.getTime())) return "-";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function loadSavedStep(step) {
  try {
    const raw = localStorage.getItem(getStepStorageKey(step));
    if (!raw) return null;
    const data = safeJsonParse(raw);
    if (!data || typeof data !== "object") return null;
    return {
      html: typeof data.html === "string" ? data.html : "",
      css: typeof data.css === "string" ? data.css : "",
      js: typeof data.js === "string" ? data.js : "",
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : null,
    };
  } catch {
    return null;
  }
}

function saveStep(step, { html, css, js }) {
  const payload = {
    html: String(html ?? ""),
    css: String(css ?? ""),
    js: String(js ?? ""),
    updatedAt: Date.now(),
  };
  localStorage.setItem(getStepStorageKey(step), JSON.stringify(payload));
  return payload.updatedAt;
}

function removeSavedStep(step) {
  try {
    localStorage.removeItem(getStepStorageKey(step));
  } catch {
    // ignore
  }
}

function collectAllSavedSteps() {
  const items = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`${STORAGE_PREFIX}:`)) continue;
      const step = key.slice(`${STORAGE_PREFIX}:`.length);
      if (!/^step\d+$/.test(step)) continue;
      const data = safeJsonParse(localStorage.getItem(key) || "");
      if (!data || typeof data !== "object") continue;
      items[step] = {
        html: typeof data.html === "string" ? data.html : "",
        css: typeof data.css === "string" ? data.css : "",
        js: typeof data.js === "string" ? data.js : "",
        updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : null,
      };
    }
  } catch {
    // ignore
  }
  return items;
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function sanitizeFilenameBase(name) {
  const raw = String(name ?? "").trim();
  if (!raw) return "";
  // Windows でも安全な文字に寄せる
  return raw
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function readExportName() {
  try {
    return localStorage.getItem(EXPORT_NAME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveExportName(v) {
  try {
    localStorage.setItem(EXPORT_NAME_STORAGE_KEY, String(v ?? ""));
  } catch {
    // ignore
  }
}

function buildExportFilename({ baseName, kind, date = new Date() }) {
  const safeBase = sanitizeFilenameBase(baseName);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const stamp = `${y}${m}${d}`;

  const prefix = safeBase ? `${safeBase}-` : "";
  if (kind === "submit") return `${prefix}shooting-learning-submit-${stamp}.json`;
  return `${prefix}shooting-learning-export-${stamp}.json`;
}

function stripStepExternalRefs(html) {
  // 元の step の index.html にある style.css / main.js を消して、
  // playground の編集内容（textarea）だけが反映されるようにする。
  let out = html;

  // link rel="stylesheet" href="style.css"（./style.css も含む）
  out = out.replace(
    /<link\b[^>]*href\s*=\s*["'](?:\.?\/)?style\.css["'][^>]*>\s*/gi,
    ""
  );

  // script src="main.js"（./main.js も含む）
  out = out.replace(
    /<script\b[^>]*src\s*=\s*["'](?:\.?\/)?main\.js["'][^>]*>\s*<\/script>\s*/gi,
    ""
  );

  return out;
}

function ensureBaseHref(html, baseHref) {
  const baseTag = `<base href="${baseHref}">`;

  // すでに base があるなら追加しない
  if (/<base\b[^>]*>/i.test(html)) return html;

  if (html.includes("</head>")) {
    return html.replace("</head>", `  ${baseTag}\n</head>`);
  }
  return baseTag + "\n" + html;
}

function hasModuleMarkers(jsText) {
  return /\/\/\s*-{3,}\s*file:\s*[^\n]+/i.test(jsText);
}

function splitModules(jsText) {
  // 形式:
  // // --- file: a.js ---
  // ...
  // // --- file: b.js ---
  // ...
  const lines = jsText.split(/\r?\n/);
  const modules = new Map();
  let currentName = null;
  let buf = [];

  const flush = () => {
    if (!currentName) return;
    modules.set(currentName, buf.join("\n") + "\n");
  };

  for (const line of lines) {
    const m = line.match(/^\s*\/\/\s*-{3,}\s*file:\s*([^\s]+)\s*-{3,}\s*$/i);
    if (m) {
      flush();
      currentName = m[1];
      buf = [];
      continue;
    }
    buf.push(line);
  }
  flush();

  return modules;
}

function buildModuleHtml({ step, html, css, modules }) {
  // modules: Map<"./x.js" or "x.js", code>
  // importmap のキーは、main.js 内での import と一致している必要がある。
  // ここでは "./xxx.js" に寄せる。

  const entries = [];
  for (const [name, code] of modules.entries()) {
    const key = name.startsWith("./") ? name : `./${name}`;
    entries.push([key, code]);
  }

  // main.js が無いと実行できない
  const hasMain = entries.some(([k]) => k === "./main.js");
  if (!hasMain) {
    // フォールバック: 何もせず単一スクリプト扱い
    return null;
  }

  // HTMLを整形（外部参照を消して、base href を入れて、CSS を埋め込む）
  let out = stripStepExternalRefs(html);
  out = ensureBaseHref(out, `./${step}/`);

  const styleTag = `\n<style>\n${css}\n</style>\n`;
  if (out.includes("</head>")) {
    out = out.replace("</head>", `${styleTag}</head>`);
  } else {
    out = styleTag + out;
  }

  // 実行部は srcdoc の中で blob module を作る
  // - importmap で ./xxx.js を blob URL に割り当て
  // - type=module で import "./main.js"
  const filesJson = JSON.stringify(Object.fromEntries(entries));
  const runner = `\n<script>\n(() => {\n  const files = ${filesJson};\n  const urls = {};\n  for (const [name, code] of Object.entries(files)) {\n    const blob = new Blob([code], { type: 'text/javascript' });\n    urls[name] = URL.createObjectURL(blob);\n  }\n\n  const importmap = { imports: urls };\n  const mapEl = document.createElement('script');\n  mapEl.type = 'importmap';\n  mapEl.textContent = JSON.stringify(importmap);\n  document.currentScript.after(mapEl);\n\n  const modEl = document.createElement('script');\n  modEl.type = 'module';\n  modEl.textContent = "import './main.js';";\n  mapEl.after(modEl);\n})();\n</script>\n`;

  if (out.includes("</body>")) {
    out = out.replace("</body>", `${runner}</body>`);
  } else {
    out = out + runner;
  }

  return out;
}

function injectCssAndJsIntoHtml({ step, html, css, js }) {
  const styleTag = `\n<style>\n${css}\n</style>\n`;
  const scriptTag = `\n<script>\n${js}\n</script>\n`;

  let out = stripStepExternalRefs(html);
  out = ensureBaseHref(out, `./${step}/`);

  if (out.includes("</head>")) {
    out = out.replace("</head>", `${styleTag}</head>`);
  } else {
    out = styleTag + out;
  }

  if (out.includes("</body>")) {
    out = out.replace("</body>", `${scriptTag}</body>`);
  } else {
    out = out + scriptTag;
  }

  return out;
}

async function loadText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} の読み込みに失敗しました (${res.status})`);
  return await res.text();
}

async function loadOptionalText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.text();
}

async function loadOptionalJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
}

function setupSampleTabs({ onChange } = {}) {
  // サンプルのソース表示（タブ式）
  const sampleHtmlEl = document.getElementById("sampleHtml");
  const sampleCssEl = document.getElementById("sampleCss");
  const sampleJsEl = document.getElementById("sampleJs");
  const sampleCodeBody = document.getElementById("sampleCodeBody");
  const sampleCodeWrap = document.querySelector(".sampleCode");
  const sampleJsFilesBar = document.getElementById("sampleJsFiles");
  const tabButtons = sampleCodeWrap
    ? Array.from(sampleCodeWrap.querySelectorAll(".tab[data-tab]"))
    : [];

  const setActiveTab = (name) => {
    for (const btn of tabButtons) {
      const active = btn.dataset.tab === name;
      btn.setAttribute("aria-selected", active ? "true" : "false");
    }
    const panes = sampleCodeWrap
      ? Array.from(sampleCodeWrap.querySelectorAll(".codePane[data-pane]"))
      : [];
    for (const pane of panes) {
      pane.hidden = pane.dataset.pane !== name;
    }
    if (sampleCodeBody) sampleCodeBody.hidden = false;

    // JSファイルボタンは、JSタブのときだけ表示（内容は main 側で制御）
    if (sampleJsFilesBar) {
      if (name === "js") {
        // main() から manifest が来ている場合だけ hidden を外す
        // （ここでは onChange に任せる）
      } else {
        sampleJsFilesBar.hidden = true;
      }
    }

    if (typeof onChange === "function") onChange(name);
  };

  for (const btn of tabButtons) {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  }

  // 「コピーできない」対策（選択不可 + copy/cut/contextmenu を抑止）
  if (sampleCodeBody) {
    sampleCodeBody.addEventListener("copy", (e) => e.preventDefault());
    sampleCodeBody.addEventListener("cut", (e) => e.preventDefault());
    sampleCodeBody.addEventListener("contextmenu", (e) => e.preventDefault());
    sampleCodeBody.addEventListener(
      "keydown",
      (e) => {
        const key = String(e.key || "").toLowerCase();
        if ((e.ctrlKey || e.metaKey) && (key === "c" || key === "x" || key === "a")) {
          e.preventDefault();
        }
      },
      true
    );
  }

  return { sampleHtmlEl, sampleCssEl, sampleJsEl, sampleJsFilesBar, setActiveTab };
}

function highlightCode(el) {
  try {
    if (!el || !window.hljs || typeof window.hljs.highlightElement !== "function") return;
    // 再ハイライトできるようにする
    if (el.hasAttribute("data-highlighted")) el.removeAttribute("data-highlighted");
    window.hljs.highlightElement(el);
  } catch {
    // ignore
  }
}

function highlightAllCodeWithin(root) {
  try {
    if (!root) return;
    const codes = root.querySelectorAll("pre code");
    for (const code of codes) highlightCode(code);
  } catch {
    // ignore
  }
}

function setupMyTabs() {
  // 右側（自分の実行）エディタのタブ
  // opts.onChange(tabName) があれば、タブ切替後に呼ぶ
  const opts = arguments.length > 0 ? arguments[0] : {};
  const myTabsWrap = document.querySelector(".myTabs");
  const myTabButtons = myTabsWrap
    ? Array.from(myTabsWrap.querySelectorAll(".tab[data-my-tab]"))
    : [];
  const myPanes = Array.from(document.querySelectorAll(".myPane[data-my-pane]"));

  const setActiveMyTab = (name) => {
    for (const btn of myTabButtons) {
      const active = btn.dataset.myTab === name;
      btn.setAttribute("aria-selected", active ? "true" : "false");
    }
    for (const pane of myPanes) {
      pane.hidden = pane.dataset.myPane !== name;
    }
  };

  for (const btn of myTabButtons) {
    btn.addEventListener("click", () => {
      const name = btn.dataset.myTab;
      setActiveMyTab(name);
      if (opts && typeof opts.onChange === "function") opts.onChange(name);
    });
  }

  return { setActiveMyTab };
}

function getEffectiveTheme() {
  const v = document.documentElement.dataset.themeEffective;
  return v === "dark" ? "dark" : "light";
}

const CODEMIRROR_VERSION = "5.65.16";
const CODEMIRROR_THEME_STORAGE_KEY = "shooting:learning:codemirrorTheme:v1";
const CODEMIRROR_THEME_FALLBACK_LIGHT = "eclipse";
const CODEMIRROR_THEME_FALLBACK_DARK = "material-darker";
const CODEMIRROR_THEME_ALLOWLIST = new Set([
  "auto",
  "eclipse",
  "idea",
  "neo",
  "material-darker",
  "darcula",
  "dracula",
  "monokai",
]);

function getCodeMirrorThemeCssUrl(name) {
  return `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/theme/${name}.min.css`;
}

function readCodeMirrorThemePref() {
  try {
    const v = localStorage.getItem(CODEMIRROR_THEME_STORAGE_KEY) || "auto";
    return CODEMIRROR_THEME_ALLOWLIST.has(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

function saveCodeMirrorThemePref(v) {
  try {
    localStorage.setItem(CODEMIRROR_THEME_STORAGE_KEY, v);
  } catch {
    // ignore
  }
}

function resolveCodeMirrorTheme(pref, effectiveTheme) {
  if (pref && pref !== "auto") return pref;
  return effectiveTheme === "dark" ? CODEMIRROR_THEME_FALLBACK_DARK : CODEMIRROR_THEME_FALLBACK_LIGHT;
}

function ensureCodeMirrorThemeCssLoaded(themeName) {
  const link = document.getElementById("cmThemeLink");
  if (!link) return;
  const url = getCodeMirrorThemeCssUrl(themeName);
  if (link.getAttribute("href") !== url) link.setAttribute("href", url);
}

function setupCodeMirrorThemePicker(editors, { onApplied } = {}) {
  const select = document.getElementById("cmThemeSelect");
  if (!select) return;

  const apply = (pref) => {
    const p = CODEMIRROR_THEME_ALLOWLIST.has(pref) ? pref : "auto";
    const effective = getEffectiveTheme();
    const themeName = resolveCodeMirrorTheme(p, effective);
    ensureCodeMirrorThemeCssLoaded(themeName);
    if (editors && typeof editors.setThemeName === "function") editors.setThemeName(themeName);
    if (typeof onApplied === "function") onApplied(p, themeName);
    return p;
  };

  const initialPref = readCodeMirrorThemePref();
  select.value = initialPref;
  let currentPref = apply(initialPref);

  select.addEventListener("change", () => {
    const next = String(select.value || "auto");
    currentPref = apply(next);
    saveCodeMirrorThemePref(currentPref);
  });

  // App theme changed (light/dark): follow only when editor is auto
  const mo = new MutationObserver(() => {
    const p = currentPref || readCodeMirrorThemePref();
    if (p === "auto") apply("auto");
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-effective"] });
}

function syncSampleCodeColorsFromEditor() {
  // サンプルコード表示の色合いを、エディタ（CodeMirror）のテーマに合わせる
  // - CodeMirror が無い場合は CSS 既定（--code-bg/--code-text）のまま
  const sampleWrap = document.querySelector(".sampleCode");
  if (!sampleWrap) return;

  // hidden な pane だとテーマ適用が未反映に見えることがあるので、まず表示中paneから拾う
  const cm =
    document.querySelector(".myPane:not([hidden]) .CodeMirror") ||
    document.querySelector(".myPane[data-my-pane='js'] .CodeMirror") ||
    document.querySelector(".myPane[data-my-pane='html'] .CodeMirror") ||
    document.querySelector(".myPane[data-my-pane='css'] .CodeMirror") ||
    document.querySelector(".CodeMirror");
  if (!cm) return;

  try {
    const cs = window.getComputedStyle(cm);
    const bg = cs.backgroundColor;
    const fg = cs.color;
    if (bg) sampleWrap.style.setProperty("--sample-editor-bg", bg);
    if (fg) sampleWrap.style.setProperty("--sample-editor-text", fg);
  } catch {
    // ignore
  }
}

function setupCodeMirrorEditors({ htmlText, cssText, jsText }) {
  const hasCm = typeof window.CodeMirror === "function";
  if (!hasCm) {
    const getValues = () => ({ html: htmlText.value, css: cssText.value, js: jsText.value });
    const getValue = (which) =>
      which === "html" ? htmlText.value : which === "css" ? cssText.value : which === "js" ? jsText.value : "";
    const setValues = ({ html, css, js }) => {
      htmlText.value = String(html ?? "");
      cssText.value = String(css ?? "");
      jsText.value = String(js ?? "");
    };
    const setValue = (which, value) => {
      const v = String(value ?? "");
      if (which === "html") htmlText.value = v;
      if (which === "css") cssText.value = v;
      if (which === "js") jsText.value = v;
    };
    const onChange = (handler) => {
      htmlText.addEventListener("input", handler);
      cssText.addEventListener("input", handler);
      jsText.addEventListener("input", handler);
    };
    const refresh = () => {};
    return { kind: "textarea", getValues, getValue, setValues, setValue, onChange, refresh };
  }

  const initialPref = readCodeMirrorThemePref();
  const initialThemeName = resolveCodeMirrorTheme(initialPref, getEffectiveTheme());
  ensureCodeMirrorThemeCssLoaded(initialThemeName);
  const baseOptions = {
    lineNumbers: true,
    tabSize: 2,
    indentUnit: 2,
    indentWithTabs: false,
    lineWrapping: true,
    viewportMargin: Infinity,
  };

  const htmlCm = window.CodeMirror.fromTextArea(htmlText, {
    ...baseOptions,
    mode: "htmlmixed",
    theme: initialThemeName,
  });
  const cssCm = window.CodeMirror.fromTextArea(cssText, {
    ...baseOptions,
    mode: "css",
    theme: initialThemeName,
  });
  const jsCm = window.CodeMirror.fromTextArea(jsText, {
    ...baseOptions,
    mode: "javascript",
    theme: initialThemeName,
  });

  const setThemeName = (name) => {
    htmlCm.setOption("theme", name);
    cssCm.setOption("theme", name);
    jsCm.setOption("theme", name);
  };

  const getValues = () => ({ html: htmlCm.getValue(), css: cssCm.getValue(), js: jsCm.getValue() });
  const getValue = (which) =>
    which === "html" ? htmlCm.getValue() : which === "css" ? cssCm.getValue() : which === "js" ? jsCm.getValue() : "";
  const setValues = ({ html, css, js }) => {
    htmlCm.setValue(String(html ?? ""));
    cssCm.setValue(String(css ?? ""));
    jsCm.setValue(String(js ?? ""));
  };
  const setValue = (which, value) => {
    const v = String(value ?? "");
    if (which === "html") htmlCm.setValue(v);
    if (which === "css") cssCm.setValue(v);
    if (which === "js") jsCm.setValue(v);
  };
  const onChange = (handler) => {
    htmlCm.on("change", handler);
    cssCm.on("change", handler);
    jsCm.on("change", handler);
  };
  const refresh = (which) => {
    const target = which === "html" ? htmlCm : which === "css" ? cssCm : which === "js" ? jsCm : null;
    const doOne = (cm) => {
      try {
        cm.refresh();
      } catch {
        // ignore
      }
    };
    if (target) {
      setTimeout(() => doOne(target), 0);
    } else {
      setTimeout(() => {
        doOne(htmlCm);
        doOne(cssCm);
        doOne(jsCm);
      }, 0);
    }
  };

  // initial refresh
  refresh();
  return { kind: "codemirror", getValues, getValue, setValues, setValue, onChange, refresh, setThemeName };
}

function setupSampleViewers({ sampleHtmlEl, sampleCssEl, sampleJsEl, themeName }) {
  // 左側（サンプル）のソース表示を、可能なら CodeMirror の readOnly で表示する。
  // これにより、右側エディタと同じテーマ配色（シンタックス含む）にできる。
  const hasCm = typeof window.CodeMirror === "function";

  const textFallback = {
    kind: "text",
    setValue: (which, value) => {
      const v = String(value ?? "").trimEnd();
      if (which === "html" && sampleHtmlEl) sampleHtmlEl.textContent = v;
      if (which === "css" && sampleCssEl) sampleCssEl.textContent = v;
      if (which === "js" && sampleJsEl) sampleJsEl.textContent = v;
    },
    setThemeName: () => {},
    refresh: () => {},
  };

  if (!hasCm) return textFallback;

  const baseOptions = {
    lineNumbers: true,
    tabSize: 2,
    indentUnit: 2,
    indentWithTabs: false,
    lineWrapping: true,
    viewportMargin: Infinity,
    readOnly: "nocursor",
    theme: themeName || resolveCodeMirrorTheme(readCodeMirrorThemePref(), getEffectiveTheme()),
  };

  const createViewer = (codeEl, mode) => {
    if (!codeEl) return null;
    const pre = codeEl.closest("pre");
    if (!pre) return null;
    const host = document.createElement("div");
    host.className = "sampleCmHost";
    pre.appendChild(host);
    // plain-text fallbackは隠す（CodeMirrorが描画される）
    codeEl.hidden = true;
    try {
      return window.CodeMirror(host, { ...baseOptions, mode, value: "" });
    } catch {
      codeEl.hidden = false;
      host.remove();
      return null;
    }
  };

  const htmlCm = createViewer(sampleHtmlEl, "htmlmixed");
  const cssCm = createViewer(sampleCssEl, "css");
  const jsCm = createViewer(sampleJsEl, "javascript");

  if (!htmlCm && !cssCm && !jsCm) return textFallback;

  const setThemeName = (name) => {
    const n = String(name || "");
    try {
      if (htmlCm) htmlCm.setOption("theme", n);
      if (cssCm) cssCm.setOption("theme", n);
      if (jsCm) jsCm.setOption("theme", n);
    } catch {
      // ignore
    }
  };

  const setValue = (which, value) => {
    const v = String(value ?? "").trimEnd();
    try {
      if (which === "html" && htmlCm) htmlCm.setValue(v);
      else if (which === "css" && cssCm) cssCm.setValue(v);
      else if (which === "js" && jsCm) jsCm.setValue(v);
      else textFallback.setValue(which, v);
    } catch {
      textFallback.setValue(which, v);
    }
  };

  const refresh = (which) => {
    const doOne = (cm) => {
      try {
        cm.refresh();
      } catch {
        // ignore
      }
    };
    if (which === "html" && htmlCm) return setTimeout(() => doOne(htmlCm), 0);
    if (which === "css" && cssCm) return setTimeout(() => doOne(cssCm), 0);
    if (which === "js" && jsCm) return setTimeout(() => doOne(jsCm), 0);
    setTimeout(() => {
      if (htmlCm) doOne(htmlCm);
      if (cssCm) doOne(cssCm);
      if (jsCm) doOne(jsCm);
    }, 0);
  };

  // 初回
  refresh();
  return { kind: "codemirror", setValue, setThemeName, refresh };
}

function parseCombinedJsToFileMap(jsText, manifestJs) {
  const list = Array.isArray(manifestJs) ? manifestJs.slice() : [];
  const normalizedList = list.map((s) => String(s || "").trim()).filter(Boolean);
  const fallbackName = normalizedList.includes("main.js")
    ? "main.js"
    : normalizedList.length > 0
      ? normalizedList[0]
      : "main.js";

  const map = new Map();
  const text = String(jsText ?? "");
  if (hasModuleMarkers(text)) {
    const parts = splitModules(text);
    for (const [k, v] of parts.entries()) {
      const name = String(k || "").replace(/^\.\//, "");
      map.set(name, String(v ?? ""));
    }
  } else {
    map.set(fallbackName, text);
  }

  for (const name of normalizedList) {
    if (!map.has(name)) map.set(name, "");
  }
  if (!map.has(fallbackName)) map.set(fallbackName, "");
  return { map, fallbackName, normalizedList };
}

function assembleFileMapToCombinedJs(fileMap, manifestJs, fallbackName = "main.js") {
  const list = Array.isArray(manifestJs) ? manifestJs.slice() : [];
  const normalizedList = list.map((s) => String(s || "").trim()).filter(Boolean);
  const order = normalizedList.length > 0 ? normalizedList : [fallbackName];

  const parts = [];
  for (const name of order) {
    const code = String(fileMap.get(name) ?? "").trimEnd();
    parts.push(`// --- file: ${name} ---\n${code}\n`);
  }
  return parts.join("\n");
}

function enableAutoGrowTextarea(textarea) {
  if (!textarea) return () => {};
  textarea.classList.add("autoGrow");

  const getMinHeight = () => {
    try {
      const v = window.getComputedStyle(textarea).minHeight;
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  const resize = () => {
    const minH = getMinHeight();
    textarea.style.height = "auto";
    const next = Math.max(minH, textarea.scrollHeight);
    textarea.style.height = `${next}px`;
  };

  textarea.addEventListener("input", resize);
  window.addEventListener("resize", resize);
  resize();
  return resize;
}

async function setupGuide(step) {
  // ガイド（任意）
  try {
    const guidePath = `./${step}/guide.md`;
    const guide = await loadOptionalText(guidePath);
    const guideWrap = document.getElementById("guide");
    const guideTitle = document.getElementById("guideTitle");
    const guideStepWrap = document.getElementById("guideStepWrap");
    const guideStepBody = document.getElementById("guideStepBody");
    const guideHowtoBody = document.getElementById("guideHowtoBody");

    if (!guideWrap || !guideTitle || !guideStepWrap || !guideStepBody || !guideHowtoBody) return;

    const commonGuide = `# Playgroundの使い方\n\n- 右側（自分のコード）のHTML/CSS/JavaScriptを編集して、上の「実行」を押すと右のプレビューに反映されます。\n- 編集内容は自動保存されます（上部の「自動保存:」に保存時刻が出ます）。\n- 「エクスポート」でJSONとして保存し、「インポート」で別PCや別ブラウザに持っていけます。\n- 「このStepをリセット」は、このStepの保存データ（自分のコード）だけを初期状態に戻します。\n\n## 画像のパス\n\n- 画像は主に \`learning/image/\` を参照します。例: \`../image/player.png\`\n- パスが合わないときは、まず画像ファイルの場所と拡張子を確認してください。\n\n## JavaScriptをファイル分けしたいとき（Step9以降）\n\n- 複数ファイル形式にしたい場合は、JS欄に次のような区切りを入れられます。\n\n\`\`\`js\n// --- file: main.js ---\n// ここにmainの内容\n\n// --- file: player.js ---\n// ここにplayerの内容\n\`\`\`\n\n- どのファイル名にするかは、各Stepのサンプル側の構成に合わせてください。\n`;

    guideWrap.hidden = false;
    guideTitle.textContent = `ガイド: ${step}`;

    guideHowtoBody.innerHTML = renderGuideMarkdown(commonGuide);
    highlightAllCodeWithin(guideHowtoBody);

    if (guide) {
      const cleaned = stripLiveServerInjection(guide);
      guideStepBody.innerHTML = renderGuideMarkdown(cleaned);
    } else {
      guideStepBody.innerHTML = `<p>このStepのガイドはありません。</p>`;
    }
    highlightAllCodeWithin(guideStepBody);

    // Tabs: step / howto
    const tabButtons = Array.from(document.querySelectorAll("[data-guide-tab]"));
    const panes = {
      step: guideStepWrap,
      howto: guideHowtoBody,
    };

    const STORAGE_KEY = `shooting:learning:playground:guideTab:v1:${step}`;
    const readPref = () => {
      try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === "howto" ? "howto" : "step";
      } catch {
        return "step";
      }
    };
    const savePref = (v) => {
      try {
        localStorage.setItem(STORAGE_KEY, v);
      } catch {
        // ignore
      }
    };

    const setActive = (key) => {
      const k = key === "howto" ? "howto" : "step";
      if (panes.step) panes.step.hidden = k !== "step";
      if (panes.howto) panes.howto.hidden = k !== "howto";
      for (const btn of tabButtons) {
        const active = btn.dataset.guideTab === k;
        btn.setAttribute("aria-selected", active ? "true" : "false");
      }
      savePref(k);
    };

    for (const btn of tabButtons) {
      btn.addEventListener("click", () => setActive(btn.dataset.guideTab));
    }
    setActive(readPref());
  } catch {
    // ガイド表示は任意機能なので、失敗しても致命的にしない
    const guideWrap = document.getElementById("guide");
    if (guideWrap) guideWrap.hidden = false;
  }
}

function splitLines(text) {
  const s = String(text ?? "").replace(/\r\n?/g, "\n");
  // 末尾の空行も保持したいので、split("\n") のまま
  return s.split("\n");
}

function myersDiffLines(aLines, bLines) {
  const a = Array.isArray(aLines) ? aLines : [];
  const b = Array.isArray(bLines) ? bLines : [];
  const N = a.length;
  const M = b.length;
  const max = N + M;

  let v = new Map();
  v.set(1, 0);
  const trace = [];

  for (let d = 0; d <= max; d++) {
    const vNext = new Map();
    for (let k = -d; k <= d; k += 2) {
      const vKMinus = v.get(k - 1);
      const vKPlus = v.get(k + 1);

      let x;
      if (k === -d || (k !== d && (vKMinus ?? -1) < (vKPlus ?? -1))) {
        x = vKPlus ?? 0;
      } else {
        x = (vKMinus ?? 0) + 1;
      }
      let y = x - k;

      while (x < N && y < M && a[x] === b[y]) {
        x++;
        y++;
      }

      vNext.set(k, x);
      if (x >= N && y >= M) {
        trace.push(vNext);
        return backtrackMyers(trace, a, b);
      }
    }
    trace.push(vNext);
    v = vNext;
  }

  return backtrackMyers(trace, a, b);
}

function backtrackMyers(trace, a, b) {
  let x = a.length;
  let y = b.length;
  const edits = [];

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    const vKMinus = v.get(k - 1);
    const vKPlus = v.get(k + 1);

    let prevK;
    if (k === -d || (k !== d && (vKMinus ?? -1) < (vKPlus ?? -1))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v.get(prevK) ?? 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({ type: "equal", line: a[x - 1] });
      x--;
      y--;
    }

    if (d === 0) break;

    if (x === prevX) {
      edits.push({ type: "add", line: b[y - 1] });
      y--;
    } else {
      edits.push({ type: "del", line: a[x - 1] });
      x--;
    }
  }

  edits.reverse();
  return edits;
}

function renderDiffToElement(container, { beforeText, afterText }) {
  if (!container) return;

  const a = splitLines(beforeText);
  const b = splitLines(afterText);
  const ops = myersDiffLines(a, b);

  // 末尾の split で必ず1行目が出るので、両方空なら空扱い
  const onlyEmpty = a.length === 1 && a[0] === "" && b.length === 1 && b[0] === "";
  if (onlyEmpty) {
    container.innerHTML = '<div class="diffLine diffEq"><span class="diffSign"> </span><span>（差分なし）</span></div>';
    return;
  }

  const hasChange = ops.some((o) => o.type !== "equal");
  if (!hasChange) {
    container.innerHTML = '<div class="diffLine diffEq"><span class="diffSign"> </span><span>（差分なし）</span></div>';
    return;
  }

  const escape = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const html = ops
    .map((o) => {
      if (o.type === "add") {
        return `<div class="diffLine diffAdd"><span class="diffSign">+</span><span>${escape(o.line)}</span></div>`;
      }
      if (o.type === "del") {
        return `<div class="diffLine diffDel"><span class="diffSign">-</span><span>${escape(o.line)}</span></div>`;
      }
      return `<div class="diffLine diffEq"><span class="diffSign"> </span><span>${escape(o.line)}</span></div>`;
    })
    .join("");
  container.innerHTML = html;
}

function setupDiffViewer({ step, editors, getUserJsCombined, sample }) {
  const diffKind = document.getElementById("diffKind");
  const diffJsFile = document.getElementById("diffJsFile");
  const diffJsFileWrap = document.getElementById("diffJsFileWrap");
  const diffView = document.getElementById("diffView");
  const diffRefreshBtn = document.getElementById("diffRefreshBtn");

  if (!diffKind || !diffView) return;

  const STORAGE_KEY = `shooting:learning:playground:diffPref:v1:${step}`;
  const readPref = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data = safeJsonParse(raw || "") || {};
      return {
        kind: data.kind === "html" || data.kind === "css" || data.kind === "js" ? data.kind : "js",
        jsFile: typeof data.jsFile === "string" ? data.jsFile : "main.js",
      };
    } catch {
      return { kind: "js", jsFile: "main.js" };
    }
  };

  const savePref = (pref) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
    } catch {
      // ignore
    }
  };

  const getTexts = () => {
    const kind = String(diffKind.value || "js");
    if (kind === "html") {
      return {
        beforeText: sample.html,
        afterText: editors.getValue("html"),
      };
    }
    if (kind === "css") {
      return {
        beforeText: sample.css,
        afterText: editors.getValue("css"),
      };
    }

    // js
    const manifest = Array.isArray(sample.manifestJs) ? sample.manifestJs : null;
    const userCombined = typeof getUserJsCombined === "function" ? getUserJsCombined() : editors.getValue("js");
    if (!manifest || manifest.length === 0 || !diffJsFile || !diffJsFileWrap) {
      return { beforeText: sample.js, afterText: userCombined };
    }

    const jsFile = String(diffJsFile.value || "main.js");
    const sampleParsed = parseCombinedJsToFileMap(sample.js, manifest);
    const userParsed = parseCombinedJsToFileMap(userCombined, manifest);
    return {
      beforeText: String(sampleParsed.map.get(jsFile) ?? ""),
      afterText: String(userParsed.map.get(jsFile) ?? ""),
    };
  };

  let updateTimer = null;
  const scheduleUpdate = () => {
    if (updateTimer) clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      const { beforeText, afterText } = getTexts();
      renderDiffToElement(diffView, { beforeText, afterText });
    }, 120);
  };

  const applyKindUi = () => {
    const kind = String(diffKind.value || "js");
    const manifest = Array.isArray(sample.manifestJs) ? sample.manifestJs : null;
    const showJsFile = kind === "js" && manifest && manifest.length > 0 && diffJsFile && diffJsFileWrap;
    if (diffJsFileWrap) diffJsFileWrap.hidden = !showJsFile;
  };

  const pref = readPref();
  diffKind.value = pref.kind;

  // JS file list (manifest)
  if (diffJsFile && Array.isArray(sample.manifestJs) && sample.manifestJs.length > 0) {
    diffJsFile.innerHTML = "";
    for (const name of sample.manifestJs) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      diffJsFile.appendChild(opt);
    }
    diffJsFile.value = sample.manifestJs.includes(pref.jsFile) ? pref.jsFile : (sample.manifestJs.includes("main.js") ? "main.js" : sample.manifestJs[0]);
  }

  applyKindUi();
  scheduleUpdate();

  diffKind.addEventListener("change", () => {
    applyKindUi();
    savePref({ kind: diffKind.value, jsFile: diffJsFile ? diffJsFile.value : "" });
    scheduleUpdate();
  });

  if (diffJsFile) {
    diffJsFile.addEventListener("change", () => {
      savePref({ kind: diffKind.value, jsFile: diffJsFile.value });
      scheduleUpdate();
    });
  }

  if (diffRefreshBtn) diffRefreshBtn.addEventListener("click", scheduleUpdate);

  // editor changes => refresh
  if (editors && typeof editors.onChange === "function") {
    editors.onChange(scheduleUpdate);
  }

  return { scheduleUpdate };
}

function setupPersistence({ step, getValues, setValues, onAnyChange }) {
  // 保存UI
  const saveInfo = document.getElementById("saveInfo");
  const exportBtn = document.getElementById("exportBtn");
  const submitBtn = document.getElementById("submitBtn");
  const importFile = document.getElementById("importFile");
  const resetStepBtn = document.getElementById("resetStepBtn");
  const exportNameInput = document.getElementById("exportName");

  // ファイル名（保存）
  if (exportNameInput) {
    exportNameInput.value = readExportName();
    exportNameInput.addEventListener("input", () => {
      saveExportName(exportNameInput.value);
    });
  }

  const updateSaveInfo = (updatedAt) => {
    if (!saveInfo) return;
    const t = formatDateTime(updatedAt);
    saveInfo.textContent = `自動保存: ${t}`;
  };

  // 自動保存（300ms）
  let saveTimer = null;
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const v = getValues();
        const updatedAt = saveStep(step, {
          html: v.html,
          css: v.css,
          js: v.js,
        });
        updateSaveInfo(updatedAt);
      } catch (e) {
        setStatus("保存に失敗しました（localStorageが使えない可能性があります）。\n" + String(e));
      }
    }, 300);
  };

  if (typeof onAnyChange === "function") {
    onAnyChange(scheduleSave);
  }

  // リセット（このStepのみ）
  if (resetStepBtn) {
    resetStepBtn.addEventListener("click", async () => {
      const m = String(step).match(/^step(\d+)$/);
      const n = m ? Number(m[1]) : 1;
      const prevStep = Number.isFinite(n) && n >= 2 ? `step${n - 1}` : null;

      removeSavedStep(step);

      // HTML/CSS は「このStepの完成形（サンプル）」を入れる
      let baseHtml = "";
      let baseCss = "";
      let baseJs = "";
      try {
        const cur = await loadStepSources(step);
        baseHtml = stripLiveServerInjection(String(cur.html ?? ""));
        baseCss = String(cur.css ?? "");
        baseJs = String(cur.js ?? "");
      } catch {
        // 読めない場合は空で続行
        baseHtml = "";
        baseCss = "";
        baseJs = "";
      }

      if (!prevStep) {
        // step1 など前stepが無い場合は、このStepのサンプルJSを入れる
        setValues({ html: baseHtml, css: baseCss, js: baseJs });
        const updatedAt = saveStep(step, getValues());
        updateSaveInfo(updatedAt);
        setStatus("このStepの入力をリセットしました（HTML/CSSは完成形、JSはサンプルに戻しました）。");
        return;
      }

      const prev = loadSavedStep(prevStep);
      if (prev && (prev.html || prev.css || prev.js)) {
        // JS だけ前stepから復元し、HTML/CSS はこのStepの完成形
        setValues({ html: baseHtml, css: baseCss, js: prev.js });
        const updatedAt = saveStep(step, getValues());
        updateSaveInfo(updatedAt);
        setStatus(`リセットしました（HTML/CSSはこのStep完成形、JSは${prevStep}の入力）。`);
        return;
      }

      // 前stepに保存が無い場合は、前stepのサンプルを復元する
      try {
        setStatus(`${prevStep} の内容を読み込んでいます...`);
        const { html, css, js } = await loadStepSources(prevStep);
        const cleanedHtml = stripLiveServerInjection(String(html ?? ""));
        // JS だけ前stepのサンプル、HTML/CSS はこのStepの完成形
        setValues({ html: baseHtml, css: baseCss, js: String(js ?? "") });
        const updatedAt = saveStep(step, getValues());
        updateSaveInfo(updatedAt);
        setStatus(`リセットしました（HTML/CSSはこのStep完成形、JSは${prevStep}のサンプル）。`);
      } catch (e) {
        setValues({ html: baseHtml, css: baseCss, js: "" });
        const updatedAt = saveStep(step, getValues());
        updateSaveInfo(updatedAt);
        setStatus("このStepの入力をリセットしました（HTML/CSSは完成形に戻しました）。\n" + String(e));
      }
    });
  }

  // エクスポート（全Step）
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const all = collectAllSavedSteps();
      const baseName = exportNameInput ? exportNameInput.value : readExportName();
      const filename = buildExportFilename({ baseName, kind: "export" });
      downloadJson(filename, {
        version: 1,
        exportedAt: Date.now(),
        items: all,
      });
      setStatus("エクスポートしました（JSONをダウンロードしました）。");
    });
  }

  // 提出（このStepのみ）
  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const v = getValues();
      const baseName = exportNameInput ? exportNameInput.value : readExportName();
      const filename = buildExportFilename({ baseName, kind: "submit" });
      downloadJson(filename, {
        version: 1,
        submittedAt: Date.now(),
        step,
        item: {
          html: String(v.html ?? ""),
          css: String(v.css ?? ""),
          js: String(v.js ?? ""),
          updatedAt: Date.now(),
        },
      });
      setStatus("提出用JSONを作成しました（このStepのみ）。");
    });
  }

  // インポート（全Step）
  if (importFile) {
    importFile.addEventListener("change", async () => {
      const file = importFile.files && importFile.files[0];
      importFile.value = "";
      if (!file) return;

      try {
        const text = await file.text();
        const data = safeJsonParse(text);
        if (!data || typeof data !== "object") throw new Error("JSONが不正です");
        if (!data.items || typeof data.items !== "object") throw new Error("itemsが見つかりません");

        const items = data.items;
        let importedCount = 0;
        for (const [k, v] of Object.entries(items)) {
          if (!/^step\d+$/.test(k)) continue;
          if (!v || typeof v !== "object") continue;
          const payload = {
            html: typeof v.html === "string" ? v.html : "",
            css: typeof v.css === "string" ? v.css : "",
            js: typeof v.js === "string" ? v.js : "",
            updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : Date.now(),
          };
          localStorage.setItem(getStepStorageKey(k), JSON.stringify(payload));
          importedCount++;
        }

        // 現在のStepを復元
        const restored = loadSavedStep(step);
        if (restored) {
          setValues({ html: restored.html, css: restored.css, js: restored.js });
          updateSaveInfo(restored.updatedAt);
        }

        setStatus(`インポートしました（${importedCount}件）。`);
      } catch (e) {
        setStatus("インポートに失敗しました。\n" + String(e));
      }
    });
  }

  return { updateSaveInfo };
}

async function loadStepSources(step) {
  // step1-8 には manifest.json が無いので、無駄な 404 を出さない
  const m = String(step).match(/^step(\d+)$/);
  const n = m ? Number(m[1]) : NaN;
  const shouldTryManifest = Number.isFinite(n) && n >= 9;
  const manifest = shouldTryManifest ? await loadOptionalJson(`./${step}/manifest.json`) : null;

  const htmlPromise = loadText(`./${step}/index.html`);
  const cssPromise = loadText(`./${step}/style.css`);

  let jsPromise;
  if (manifest && Array.isArray(manifest.js) && manifest.js.length > 0) {
    jsPromise = (async () => {
      const parts = [];
      for (const name of manifest.js) {
        const code = await loadText(`./${step}/${name}`);
        parts.push(`// --- file: ${name} ---\n${code.trimEnd()}\n`);
      }
      return parts.join("\n");
    })();
  } else {
    jsPromise = loadText(`./${step}/main.js`);
  }

  const [html, css, js] = await Promise.all([htmlPromise, cssPromise, jsPromise]);
  const manifestJs = manifest && Array.isArray(manifest.js) ? manifest.js.slice() : null;
  return { html, css, js, manifestJs };
}

function setupRunner({ step, htmlText, cssText, jsText, fallbackHtml = "", fallbackCss = "" }) {
  const run = () => {
    const outFrame = document.getElementById("outFrame");
    // 右側は初期状態が空なので、HTML/CSSが空のときは step の素材を土台として使う。
    // （JSだけ書いても実行できるようにする）
    const userHtml = htmlText.value;
    const userCss = cssText.value;
    let js = jsText.value;

    const looksLikeHtml = (s) => /<\s*[a-z!/]/i.test(String(s || ""));
    const looksLikeJs = (s) =>
      /\b(const|let|var|function|class|import|export)\b/.test(String(s || "")) ||
      /\b(document|window|canvas|ctx)\b/.test(String(s || ""));
    const userHtmlTrimmed = String(userHtml || "").trim();
    const jsTrimmed = String(js || "").trim();

    // HTML欄にJS本文を貼ると、そのまま“文章”として表示されてしまう。
    // HTMLとして成立していない（タグらしきものが無い）場合は、step素材を土台にする。
    // ありがちなミス: HTML欄にJSを書いてしまう
    // - JS欄が空で、HTML欄がHTMLっぽくなく、JSっぽいときは「HTML=土台」「JS=HTML欄の内容」として実行する
    if (!jsTrimmed && userHtmlTrimmed && !looksLikeHtml(userHtmlTrimmed) && looksLikeJs(userHtmlTrimmed)) {
      js = userHtml;
    }

    const shouldFallbackHtml =
      !userHtmlTrimmed || (!looksLikeHtml(userHtmlTrimmed) && (String(js || "").trim() || looksLikeJs(userHtmlTrimmed)));

    const html = shouldFallbackHtml ? fallbackHtml : userHtml;
    const css = String(userCss || "").trim() ? userCss : fallbackCss;

    // stepのHTMLは元々 link/script を参照していますが、
    // ここでは“編集した内容”を確実に反映するため、外部参照を消してCSS/JSを埋め込みます。
    // さらに base href を入れて、step内の相対パス（../image など）が動くようにします。
    // 複数ファイル（manifest）を 1つの textarea に入れている場合は、
    // moduleとして実行できるように importmap + blob module を組み立てる。
    const maybeModules = hasModuleMarkers(js) ? splitModules(js) : null;
    const srcdoc =
      maybeModules && maybeModules.size > 0
        ? buildModuleHtml({ step, html, css, modules: maybeModules }) ??
          injectCssAndJsIntoHtml({ step, html, css, js })
        : injectCssAndJsIntoHtml({ step, html, css, js });
    outFrame.srcdoc = srcdoc;
    setStatus("実行しました。");
  };

  const runBtn = document.getElementById("runBtn");
  if (runBtn) runBtn.addEventListener("click", run);

  // 初回も実行して表示しておく
  setTimeout(run, 0);
}

async function main() {
  const step = getStepParam();

  const titleEl = document.getElementById("pageTitle");
  titleEl.textContent = `Playground: ${step}`;

  const sampleFrame = document.getElementById("sampleFrame");
  const sampleUrl = `./${step}/index.html`;
  sampleFrame.src = sampleUrl;

  const sampleOpen = document.getElementById("sampleOpen");
  if (sampleOpen) sampleOpen.href = sampleUrl;

  // サンプルのソース表示（表示のみ）
  let sampleJsManifestList = null;
  let sampleJsFileMap = null;
  let sampleJsActiveFile = "main.js";
  const renderSampleJsFileButtons = (bar, setJsValue) => {
    if (!bar) return;
    bar.innerHTML = "";
    if (!sampleJsManifestList || sampleJsManifestList.length === 0) {
      bar.hidden = true;
      return;
    }

    for (const name of sampleJsManifestList) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab";
      btn.dataset.sampleJsFile = name;
      btn.setAttribute("role", "tab");
      const active = name === sampleJsActiveFile;
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.textContent = name;
      btn.addEventListener("click", () => {
        if (!sampleJsFileMap) return;
        sampleJsActiveFile = name;
        if (typeof setJsValue === "function") {
          setJsValue(String(sampleJsFileMap.get(sampleJsActiveFile) ?? "").trimEnd());
        }
        renderSampleJsFileButtons(bar, setJsValue);
      });
      bar.appendChild(btn);
    }
  };

  const { sampleHtmlEl, sampleCssEl, sampleJsEl, sampleJsFilesBar, setActiveTab: setSampleTab } = setupSampleTabs({
    onChange: (name) => {
      if (!sampleJsFilesBar) return;
      if (name !== "js") {
        sampleJsFilesBar.hidden = true;
        if (sampleViewers && typeof sampleViewers.refresh === "function") sampleViewers.refresh(name);
        return;
      }
      if (!sampleJsManifestList || sampleJsManifestList.length === 0) {
        sampleJsFilesBar.hidden = true;
        if (sampleViewers && typeof sampleViewers.refresh === "function") sampleViewers.refresh(name);
        return;
      }
      sampleJsFilesBar.hidden = false;
      renderSampleJsFileButtons(sampleJsFilesBar, (v) => sampleViewers.setValue("js", v));
      if (sampleViewers && typeof sampleViewers.refresh === "function") sampleViewers.refresh(name);
    },
  });

  // サンプルビューア（左側）も CodeMirror テーマに合わせる
  const initialSampleThemeName = resolveCodeMirrorTheme(readCodeMirrorThemePref(), getEffectiveTheme());
  const sampleViewers = setupSampleViewers({
    sampleHtmlEl,
    sampleCssEl,
    sampleJsEl,
    themeName: initialSampleThemeName,
  });

  // 初期はHTMLタブを表示
  if (typeof setSampleTab === "function") setSampleTab("html");

  const resizeMy = { html: null, css: null, js: null };

  // Step9+ の JS 分割（manifest）対応：JSタブ内でファイル選択できるようにする
  const jsFilesBar = document.getElementById("jsFiles");
  let jsManifestList = null;
  let jsFileMap = null;
  let jsActiveFile = "main.js";
  const setJsFilesVisible = (visible) => {
    if (!jsFilesBar) return;
    if (!jsManifestList || jsManifestList.length === 0) {
      jsFilesBar.hidden = true;
      return;
    }
    jsFilesBar.hidden = !visible;
  };
  const renderJsFileButtons = () => {
    if (!jsFilesBar) return;
    jsFilesBar.innerHTML = "";
    if (!jsManifestList || jsManifestList.length === 0) {
      jsFilesBar.hidden = true;
      return;
    }

    for (const name of jsManifestList) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab";
      btn.dataset.jsFile = name;
      btn.setAttribute("role", "tab");
      const active = name === jsActiveFile;
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.textContent = name;
      btn.addEventListener("click", () => {
        if (!jsFileMap) return;
        // 現在のファイルを保存してから切替
        jsFileMap.set(jsActiveFile, editors.getValue("js"));
        jsActiveFile = name;
        editors.setValue("js", jsFileMap.get(jsActiveFile) ?? "");
        editors.refresh("js");
        renderJsFileButtons();
      });
      jsFilesBar.appendChild(btn);
    }
  };
  const ensureJsFilesFromCombined = (combinedJs) => {
    if (!jsManifestList || jsManifestList.length === 0) return;
    const { map, fallbackName } = parseCombinedJsToFileMap(combinedJs, jsManifestList);
    jsFileMap = map;
    if (!jsManifestList.includes(jsActiveFile)) {
      jsActiveFile = jsManifestList.includes("main.js") ? "main.js" : fallbackName;
    }
    editors.setValue("js", jsFileMap.get(jsActiveFile) ?? "");
    editors.refresh("js");
    renderJsFileButtons();
  };
  const getCombinedJsFromFiles = () => {
    if (!jsManifestList || jsManifestList.length === 0) return editors.getValue("js");
    if (!jsFileMap) {
      ensureJsFilesFromCombined(editors.getValue("js"));
    }
    if (jsFileMap) {
      jsFileMap.set(jsActiveFile, editors.getValue("js"));
      return assembleFileMapToCombinedJs(jsFileMap, jsManifestList, jsActiveFile);
    }
    return editors.getValue("js");
  };

  const { setActiveMyTab } = setupMyTabs({
    onChange: (name) => {
      if (!name) return;
      const fn = resizeMy[name];
      if (typeof fn === "function") fn();

      // JSタブを開いた時点で、manifest があればファイルボタンを出す
      if (name === "js") {
        setJsFilesVisible(true);
        renderJsFileButtons();
      } else {
        setJsFilesVisible(false);
      }
    },
  });
  await setupGuide(step);

  const htmlText = document.getElementById("htmlText");
  const cssText = document.getElementById("cssText");
  const jsText = document.getElementById("jsText");

  const editors = setupCodeMirrorEditors({ htmlText, cssText, jsText });

  // CodeMirror テーマCSSの読み込み完了後に、サンプル表示の配色を同期する
  const cmThemeLink = document.getElementById("cmThemeLink");
  if (cmThemeLink) {
    cmThemeLink.addEventListener("load", () => {
      // 読み込み直後はスタイル計算が落ち着かないことがあるため少し遅らせる
      setTimeout(syncSampleCodeColorsFromEditor, 0);
      setTimeout(syncSampleCodeColorsFromEditor, 50);
      setTimeout(syncSampleCodeColorsFromEditor, 150);
    });
  }

  // CodeMirror テーマ（公開テーマから選択）
  setupCodeMirrorThemePicker(editors, {
    onApplied: (_pref, themeName) => {
      // テーマCSSの適用が落ち着いてから同期
      setTimeout(syncSampleCodeColorsFromEditor, 0);
      setTimeout(syncSampleCodeColorsFromEditor, 50);
      if (sampleViewers && typeof sampleViewers.setThemeName === "function") {
        sampleViewers.setThemeName(themeName);
        sampleViewers.refresh();
      }
    },
  });

  // 初回も同期
  setTimeout(syncSampleCodeColorsFromEditor, 0);

  // タブ切替で CodeMirror の表示を確実にする（hidden状態対策）
  const myTabButtons = Array.from(document.querySelectorAll(".myTabs .tab[data-my-tab]"));
  for (const btn of myTabButtons) {
    btn.addEventListener("click", () => {
      const name = btn.dataset.myTab;
      if (editors && typeof editors.refresh === "function") editors.refresh(name);
      // 表示paneが切り替わった後に同期（テーマがpaneごとに見え方が変わるのを防ぐ）
      setTimeout(syncSampleCodeColorsFromEditor, 0);
    });
  }

  const setMyTab = (name) => {
    setActiveMyTab(name);
    if (editors && typeof editors.refresh === "function") editors.refresh(name);
  };

  // 右側は最初にJavaScriptタブを開いておく（中身は空）
  setMyTab("js");

  // 右側が空でも実行できるよう、step素材を fallback として保持
  let fallbackHtml = "";
  let fallbackCss = "";

  // 差分表示・初期値用の「このStepのサンプル」
  const stepSample = { html: "", css: "", js: "", manifestJs: null };

  // 各stepのファイルを読み込んで、エディタに入れる
  try {
    const { html, css, js, manifestJs } = await loadStepSources(step);

    // 左側（サンプル）にはソースを表示する（Live Server 注入は除去）
    sampleViewers.setValue("html", stripLiveServerInjection(html));
    sampleViewers.setValue("css", String(css ?? "").trimEnd());

    if (Array.isArray(manifestJs) && manifestJs.length > 0) {
      sampleJsManifestList = manifestJs.map((s) => String(s || "").trim()).filter(Boolean);
      const parsed = parseCombinedJsToFileMap(js, sampleJsManifestList);
      sampleJsFileMap = parsed.map;
      sampleJsActiveFile = sampleJsManifestList.includes("main.js") ? "main.js" : parsed.fallbackName;
      sampleViewers.setValue("js", String(sampleJsFileMap.get(sampleJsActiveFile) ?? "").trimEnd());
      if (sampleJsFilesBar) {
        // JSタブを開いた時に出るが、開いている場合に備えて生成しておく
        renderSampleJsFileButtons(sampleJsFilesBar, (v) => sampleViewers.setValue("js", v));
      }
    } else {
      sampleJsManifestList = null;
      sampleJsFileMap = null;
      if (sampleJsFilesBar) sampleJsFilesBar.hidden = true;
      sampleViewers.setValue("js", String(js ?? "").trimEnd());
    }

    // 初回は見えているタブの viewer を refresh
    if (sampleViewers && typeof sampleViewers.refresh === "function") sampleViewers.refresh();

    // Step9+ の manifest を保持
    jsManifestList = Array.isArray(manifestJs) ? manifestJs.map((s) => String(s || "").trim()).filter(Boolean) : null;
    if (jsManifestList && jsManifestList.length > 0) {
      jsActiveFile = jsManifestList.includes("main.js") ? "main.js" : jsManifestList[0];
      setJsFilesVisible(true);
      renderJsFileButtons();
    } else {
      jsManifestList = null;
      jsFileMap = null;
      setJsFilesVisible(false);
    }

    // iframe(srcdoc) の土台として使う分は、Live Server の注入が混ざる場合に備えて除去しておく
    fallbackHtml = stripLiveServerInjection(html);
    fallbackCss = String(css ?? "");

    stepSample.html = fallbackHtml;
    stepSample.css = String(css ?? "");
    stepSample.js = String(js ?? "");
    stepSample.manifestJs = Array.isArray(manifestJs)
      ? manifestJs.map((s) => String(s || "").trim()).filter(Boolean)
      : null;

    // 右側（自分の実行）は基本は空。保存データがあれば復元する。
    const wrappedEditors = {
      ...editors,
      getValues: () => {
        const v = editors.getValues();
        if (jsManifestList && jsManifestList.length > 0) {
          return { ...v, js: getCombinedJsFromFiles() };
        }
        return v;
      },
      setValues: ({ html, css, js }) => {
        editors.setValue("html", String(html ?? ""));
        editors.setValue("css", String(css ?? ""));
        if (jsManifestList && jsManifestList.length > 0) {
          ensureJsFilesFromCombined(String(js ?? ""));
        } else {
          editors.setValue("js", String(js ?? ""));
        }
      },
      onChange: (handler) => {
        editors.onChange(() => {
          // js編集中は Map へ反映してから handler を呼ぶ
          if (jsManifestList && jsManifestList.length > 0) {
            if (!jsFileMap) ensureJsFilesFromCombined(editors.getValue("js"));
            if (jsFileMap) jsFileMap.set(jsActiveFile, editors.getValue("js"));
          }
          handler();
        });
      },
    };

    const { updateSaveInfo } = setupPersistence({
      step,
      getValues: wrappedEditors.getValues,
      setValues: wrappedEditors.setValues,
      onAnyChange: wrappedEditors.onChange,
    });

    const restored = loadSavedStep(step);
    if (restored) {
      wrappedEditors.setValues({ html: restored.html, css: restored.css, js: restored.js });
      updateSaveInfo(restored.updatedAt);
      editors.refresh();
      setStatus("読み込み完了。保存済みの入力を復元しました。");
    } else {
      // step2以降は、前のstepの入力を初期値として引き継ぐ
      const m = String(step).match(/^step(\d+)$/);
      const n = m ? Number(m[1]) : 1;
      const prevStep = Number.isFinite(n) && n >= 2 ? `step${n - 1}` : null;
      const prev = prevStep ? loadSavedStep(prevStep) : null;
      if (prev && (prev.html || prev.css || prev.js)) {
        wrappedEditors.setValues({ html: prev.html, css: prev.css, js: prev.js });
        // 引き継いだ状態も、このStepとして保存しておく（次回以降も同じ状態で開ける）
        const updatedAt = saveStep(step, wrappedEditors.getValues());
        updateSaveInfo(updatedAt);
        editors.refresh();
        setStatus(`読み込み完了。${prevStep} の入力を引き継ぎました。`);
      } else {
        // 初回はサンプルを初期値として入れておく（右側プレビューがすぐ動く）
        wrappedEditors.setValues({ html: stepSample.html, css: stepSample.css, js: stepSample.js });
        const updatedAt = saveStep(step, wrappedEditors.getValues());
        updateSaveInfo(updatedAt);
        editors.refresh();
        setStatus("読み込み完了。サンプルを初期値として読み込みました。編集して『実行』してください。");
      }
    }

    // 差分ビュー（サンプル vs 自分）
    setupDiffViewer({
      step,
      editors: wrappedEditors,
      getUserJsCombined: () => (jsManifestList && jsManifestList.length > 0 ? getCombinedJsFromFiles() : wrappedEditors.getValue("js")),
      sample: stepSample,
    });
  } catch (e) {
    setStatus(
      "読み込みに失敗しました。Live Server等で開いているか確認してください。\n" +
        String(e)
    );
  }

  // runner は textarea.value を読むので、常に CodeMirror -> textarea を同期してから実行する
  // CodeMirror.fromTextArea は内部で textarea を隠すが、値同期は明示しておく。
  const getValuesForRun = () => editors.getValues();
  const syncToTextareas = () => {
    const v = jsManifestList && jsManifestList.length > 0
      ? { ...getValuesForRun(), js: getCombinedJsFromFiles() }
      : getValuesForRun();
    htmlText.value = v.html;
    cssText.value = v.css;
    jsText.value = v.js;
  };

  const runBtn = document.getElementById("runBtn");
  if (runBtn) {
    runBtn.addEventListener("click", () => {
      syncToTextareas();
    });
  }

  // 初回実行も同期してから
  syncToTextareas();
  setupRunner({ step, htmlText, cssText, jsText, fallbackHtml, fallbackCss });
}

main();
