import { loadPdfList, loadPdfQuestions, buildViewerUrl, renderPdfList, renderPdfQuestions, exportPdfAnswersCsv } from "../assets/js/pdf-mode.js";
import { downloadCsv } from "../assets/js/csv-export.js";
import { renderLoginStatus } from "../assets/js/app-shell.js";

const el = {
  pdfList: document.getElementById("pdfList"),
  viewer: document.getElementById("viewer"),
  currentPdf: document.getElementById("currentPdf"),
  scope: document.getElementById("scope"),
  scopeNote: document.getElementById("scopeNote"),
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
  scope: null,
  currentQuestions: [],
  answers: {},
};

function normalizeScopes(pdf) {
  const scopes = Array.isArray(pdf?.scopes) ? pdf.scopes : [];
  if (scopes.length) return scopes;
  return [{ id: "all", label: "全体", questionCount: 50, pageFrom: null, pageTo: null, note: "" }];
}

function buildPlaceholderQuestions(pdfId, scope, count) {
  const n = Math.max(1, Number(count || 50));
  const scopeId = scope?.id ?? "all";
  const list = [];
  for (let i = 1; i <= n; i++) {
    list.push({
      id: `pdf-${pdfId}-${scopeId}-${String(i).padStart(2, "0")}`,
      format: "text",
      stem: "",
      source: { type: "pdf", pdfId, page: "", label: `問${i}` },
    });
  }
  return list;
}

function setViewer(page) {
  if (!state.current) return;
  el.viewer.src = buildViewerUrl(state.current.path, page);
}

function setCurrentScope(scopeId) {
  if (!state.current) return;
  const scopes = normalizeScopes(state.current);
  const next = scopes.find((s) => s.id === scopeId) ?? scopes[0];
  state.scope = next;
  el.scope.value = next.id;

  const from = next.pageFrom ? `p.${next.pageFrom}` : "";
  const to = next.pageTo ? `p.${next.pageTo}` : "";
  const range = from || to ? `${from}${to ? `〜${to}` : ""}` : "（範囲未設定）";
  el.scopeNote.textContent = `${next.label} / ${range}${next.note ? ` — ${next.note}` : ""}`;

  const jumpPage = Number(next.pageFrom || "1");
  el.page.value = jumpPage;
  setViewer(jumpPage);

  const matched = state.pdfQuestions.filter((q) => q.source?.pdfId === state.current.id);
  state.currentQuestions = matched.length
    ? matched
    : buildPlaceholderQuestions(state.current.id, next, next.questionCount ?? 50);

  renderPdfQuestions(el.pdfQuestions, state.currentQuestions);

  state.answers = {};
  el.export.disabled = false;
  el.exportStatus.textContent = `${state.currentQuestions.length}問`;

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

function setCurrentPdf(pdf) {
  state.current = pdf;
  el.currentPdf.textContent = `${pdf.title} (${pdf.id})`;

  const scopes = normalizeScopes(pdf);
  el.scope.innerHTML = scopes.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
  setCurrentScope(scopes[0]?.id);
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

el.scope.addEventListener("change", () => {
  if (!state.current) return;
  setCurrentScope(el.scope.value);
});

el.jump.addEventListener("click", () => {
  const p = Math.max(1, Number(el.page.value || "1"));
  setViewer(p);
});

el.export.addEventListener("click", () => {
  if (!state.current) return;
  const exportId = state.scope ? `${state.current.id}-${state.scope.id}` : state.current.id;
  const rows = exportPdfAnswersCsv(exportId, state.currentQuestions, state.answers);

  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  downloadCsv(`it3-pdf-${exportId}-${stamp}.csv`, rows, { bom: true });
  el.exportStatus.textContent = "出力しました";
});

init();

// 任意: ログイン状態表示
const badge = document.createElement("span");
badge.className = "dg-badge";
document.querySelector(".dg-header__inner")?.appendChild(badge);
renderLoginStatus(badge);
