import { loadAllPracticeQuestions, groupBySection, shuffle } from "./practice-loader.js";
import { renderQuestion, gradeQuestion, renderExplanation } from "./practice-engine.js";
import { renderLoginStatus } from "../assets/js/app-shell.js";

const el = {
  section: document.getElementById("section"),
  start: document.getElementById("start"),
  status: document.getElementById("status"),
  progress: document.getElementById("progress"),
  resultBadge: document.getElementById("resultBadge"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  resetAnswer: document.getElementById("resetAnswer"),
  showExplanation: document.getElementById("showExplanation"),
  question: document.getElementById("question"),
  explanation: document.getElementById("explanation"),
};

const state = {
  all: [],
  bySection: new Map(),
  list: [],
  index: 0,
  answers: {},
};

const QUESTION_COUNT = 10;
const SECTION_ORDER = ["基本用語", "計算・論理回路", "フローチャート", "プログラミング"];

function setBadge(text, variant) {
  el.resultBadge.style.display = "inline-flex";
  el.resultBadge.textContent = text;
  el.resultBadge.classList.remove("dg-badge--ok", "dg-badge--ng");
  if (variant === "ok") el.resultBadge.classList.add("dg-badge--ok");
  if (variant === "ng") el.resultBadge.classList.add("dg-badge--ng");
}

function setExplanationPressed(pressed) {
  el.showExplanation.setAttribute("aria-pressed", pressed ? "true" : "false");
  el.showExplanation.classList.toggle("dg-btn--primary", pressed);
  el.showExplanation.classList.toggle("dg-btn--subtle", !pressed);
}

function showExplanation(q) {
  el.explanation.innerHTML = "";
  renderExplanation(el.explanation, q);
  setExplanationPressed(true);
}

function applyGradeResult(g) {
  if (!g) return;
  if (g.ok === null) {
    setBadge(g.message ?? "未採点", "");
    return;
  }
  setBadge(g.ok ? "正解" : "不正解", g.ok ? "ok" : "ng");
}

function render() {
  const q = state.list[state.index];
  if (!q) {
    el.question.innerHTML = "<div class=\"dg-note\">問題がありません。データJSONを確認してください。</div>";
    return;
  }

  el.explanation.innerHTML = "";
  el.resultBadge.style.display = "none";
  setExplanationPressed(false);

  el.progress.textContent = `${state.index + 1} / ${state.list.length}`;
  renderQuestion(el.question, q, state);
}

function goto(i) {
  state.index = Math.max(0, Math.min(i, state.list.length - 1));
  render();
}

async function init() {
  el.status.textContent = "読込中...";

  try {
    state.all = await loadAllPracticeQuestions();
    state.bySection = groupBySection(state.all);

    el.section.innerHTML = SECTION_ORDER
      .map((s) => {
        const count = (state.bySection.get(s) || []).length;
        return `<option value="${s}">${s} (${count}問)</option>`;
      })
      .join("");

    el.status.textContent = `問題 ${state.all.length} 件`;
    el.status.classList.remove("dg-badge--danger");
    el.status.classList.add("dg-badge--ok");
  } catch (error) {
    el.status.textContent = `エラー: ${error.message}`;
    el.status.classList.add("dg-badge--danger");
    console.error(error);
  }
}

el.start.addEventListener("click", () => {
  const sec = el.section.value;
  const base = state.bySection.get(sec) || [];
  state.list = shuffle(base).slice(0, Math.min(QUESTION_COUNT, base.length));
  state.index = 0;
  state.answers = {};
  render();
});

el.prev.addEventListener("click", () => goto(state.index - 1));
el.next.addEventListener("click", () => goto(state.index + 1));

el.resetAnswer.addEventListener("click", () => {
  const q = state.list[state.index];
  if (!q) return;
  delete state.answers[q.id];
  el.explanation.innerHTML = "";
  el.resultBadge.style.display = "none";
  setExplanationPressed(false);
  render();
});

el.showExplanation.addEventListener("click", () => {
  const q = state.list[state.index];
  showExplanation(q);
});

// choiceは「選択した瞬間に自動採点」するため、レンダラからの通知を受け取る
el.question.addEventListener("practice:graded", (e) => {
  const q = state.list[state.index];
  const g = e.detail;
  applyGradeResult(g);

  // 正解した時点で、解説ボタンを押した扱いにして解説を表示
  if (g?.ok === true && q) {
    showExplanation(q);
  }
});

init();

// 公開機能だが、表示用にログイン状態は出せる（任意）
const badge = document.createElement("span");
badge.className = "dg-badge";
document.querySelector(".dg-header__inner")?.appendChild(badge);
renderLoginStatus(badge);
