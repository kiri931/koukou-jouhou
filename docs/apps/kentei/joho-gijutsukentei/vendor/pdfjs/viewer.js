import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

const el = {
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  page: document.getElementById("page"),
  pages: document.getElementById("pages"),
  go: document.getElementById("go"),
  open: document.getElementById("open"),
  meta: document.getElementById("meta"),
  canvas: document.getElementById("canvas"),
  error: document.getElementById("error"),
};

const qs = new URLSearchParams(location.search);
const fileParam = qs.get("file") || "";
const pageParam = Number(qs.get("page") || "1");

function resolveFileUrl(file) {
  if (!file) return null;
  try {
    return new URL(file, location.href).toString();
  } catch {
    return null;
  }
}

const fileUrl = resolveFileUrl(fileParam);

const state = {
  pdf: null,
  pageNumber: Math.max(1, Number.isFinite(pageParam) ? pageParam : 1),
  numPages: 0,
  rendering: false,
};

function showError(msg) {
  el.error.hidden = false;
  el.error.textContent = msg;
}

async function renderPage() {
  if (!state.pdf || state.rendering) return;
  state.rendering = true;

  try {
    const page = await state.pdf.getPage(state.pageNumber);

    const viewport = page.getViewport({ scale: 1.2 });
    const ratio = window.devicePixelRatio || 1;

    el.canvas.width = Math.floor(viewport.width * ratio);
    el.canvas.height = Math.floor(viewport.height * ratio);
    el.canvas.style.width = `${Math.floor(viewport.width)}px`;
    el.canvas.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = el.canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    await page.render({ canvasContext: ctx, viewport }).promise;

    el.page.value = String(state.pageNumber);
    el.pages.textContent = `/ ${state.numPages}`;

    // URLを更新（親iframeからも扱いやすい）
    const params = new URLSearchParams(location.search);
    params.set("page", String(state.pageNumber));
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  } catch (e) {
    console.error(e);
    showError(String(e));
  } finally {
    state.rendering = false;
  }
}

function clampPage(n) {
  const v = Math.max(1, Math.min(n, state.numPages || n));
  return v;
}

el.prev.addEventListener("click", () => {
  state.pageNumber = clampPage(state.pageNumber - 1);
  renderPage();
});

el.next.addEventListener("click", () => {
  state.pageNumber = clampPage(state.pageNumber + 1);
  renderPage();
});

el.go.addEventListener("click", () => {
  state.pageNumber = clampPage(Number(el.page.value || "1"));
  renderPage();
});

el.page.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  state.pageNumber = clampPage(Number(el.page.value || "1"));
  renderPage();
});

async function init() {
  if (!fileUrl) {
    showError("file パラメータがありません。例: viewer.html?file=./pdf/sample.pdf&page=1");
    return;
  }

  el.meta.textContent = fileUrl;
  el.open.href = fileUrl;

  try {
    const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
    state.pdf = await loadingTask.promise;
    state.numPages = state.pdf.numPages;
    state.pageNumber = clampPage(state.pageNumber);
    await renderPage();
  } catch (e) {
    console.error(e);
    showError("PDFの読み込みに失敗しました。URL/配信設定/CORSを確認してください。\n" + String(e));
  }
}

init();
