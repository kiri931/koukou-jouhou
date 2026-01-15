import { loadPdfList, loadPdfQuestions, buildViewerUrl, renderPdfList, renderPdfQuestions, exportPdfAnswersCsv } from "../assets/js/pdf-mode.js";
import { downloadCsv } from "../assets/js/csv-export.js";
import { renderLoginStatus } from "../assets/js/app-shell.js";

const el = {
  pdfList: document.getElementById("pdfList"),
  viewer: document.getElementById("viewer"),
  currentPdf: document.getElementById("currentPdf"),
  page: document.getElementById("page"),
  jump: document.getElementById("jump"),
  pdfQuestions: document.getElementById("pdfQuestions"),
  export: document.getElementById("export"),
  exportStatus: document.getElementById("exportStatus"),
};

const state = {
  pdfList: [],
  pdfQuestions: [],
  current: null,
  answers: {},
};

function setViewer(page) {
  if (!state.current) return;
  el.viewer.src = buildViewerUrl(state.current.path, page);
}

function setCurrentPdf(pdf) {
  state.current = pdf;
  el.currentPdf.textContent = `${pdf.title} (${pdf.id})`;
  el.page.value = 1;
  setViewer(1);

  const qs = state.pdfQuestions.filter((q) => q.source?.pdfId === pdf.id);
  renderPdfQuestions(el.pdfQuestions, qs);

  state.answers = {};
  el.export.disabled = false;
  el.exportStatus.textContent = `${qs.length}問`;

  // 回答入力の監視
  el.pdfQuestions.querySelectorAll("[data-answer-id]").forEach((input) => {
    input.addEventListener("input", () => {
      state.answers[input.dataset.answerId] = input.value;
    });
  });

  // ページジャンプボタン
  el.pdfQuestions.querySelectorAll("[data-jump-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.dataset.jumpPage || "1");
      el.page.value = page;
      setViewer(page);
    });
  });
}

async function init() {
  state.pdfList = await loadPdfList();
  state.pdfQuestions = await loadPdfQuestions();

  renderPdfList(el.pdfList, state.pdfList);

  el.pdfList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-open]");
    if (!btn) return;
    const id = btn.dataset.open;
    const pdf = state.pdfList.find((p) => p.id === id);
    if (pdf) setCurrentPdf(pdf);
  });
}

el.jump.addEventListener("click", () => {
  const p = Math.max(1, Number(el.page.value || "1"));
  setViewer(p);
});

el.export.addEventListener("click", () => {
  if (!state.current) return;
  const qs = state.pdfQuestions.filter((q) => q.source?.pdfId === state.current.id);
  const rows = exportPdfAnswersCsv(state.current.id, qs, state.answers);

  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  downloadCsv(`it3-pdf-${state.current.id}-${stamp}.csv`, rows, { bom: true });
  el.exportStatus.textContent = "出力しました";
});

init();

// 任意: ログイン状態表示
const badge = document.createElement("span");
badge.className = "dg-badge";
document.querySelector(".dg-header__inner")?.appendChild(badge);
renderLoginStatus(badge);
