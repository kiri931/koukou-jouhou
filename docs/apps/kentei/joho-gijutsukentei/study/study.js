import { renderMath } from "../assets/js/katex-render.js";

const el = {
  content: document.getElementById("content"),
  status: document.getElementById("status"),
  reload: document.getElementById("reload"),
};

function setStatus(text, variant) {
  el.status.textContent = text;
  el.status.classList.remove("dg-badge--ok", "dg-badge--ng");
  if (variant === "ok") el.status.classList.add("dg-badge--ok");
  if (variant === "ng") el.status.classList.add("dg-badge--ng");
}

async function loadLibraries() {
  // marked + DOMPurify (CDN)
  const [{ marked }, DOMPurify] = await Promise.all([
    import("https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js"),
    import("https://cdn.jsdelivr.net/npm/dompurify@3.0.10/dist/purify.es.mjs"),
  ]);

  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  return { marked, DOMPurify };
}

async function render() {
  setStatus("読込中...", null);
  el.content.innerHTML = "";

  try {
    const { marked, DOMPurify } = await loadLibraries();

    const res = await fetch("./it3-study.md", { cache: "no-store" });
    if (!res.ok) throw new Error(`Markdownの取得に失敗: ${res.status}`);

    const md = await res.text();

    const rawHtml = marked.parse(md);
    const safeHtml = DOMPurify.default.sanitize(String(rawHtml), {
      USE_PROFILES: { html: true },
    });

    el.content.innerHTML = safeHtml;

    // KaTeX（$...$）があればレンダ
    renderMath(el.content);

    setStatus("表示中", "ok");
  } catch (e) {
    console.error(e);
    el.content.innerHTML = `<div class="dg-note">エラー: ${String(e)}</div>`;
    setStatus("エラー", "ng");
  }
}

el.reload.addEventListener("click", render);
render();
