import { loadAllQuestions, groupBySection } from "../assets/js/question-bank.js";
import { renderQuestion, gradeQuestion, renderExplanation } from "../assets/js/quiz-engine.js";
import { renderLoginStatus } from "../assets/js/app-shell.js";

const el = {
  section: document.getElementById("section"),
  order: document.getElementById("order"),
  start: document.getElementById("start"),
  status: document.getElementById("status"),
  progress: document.getElementById("progress"),
  resultBadge: document.getElementById("resultBadge"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  grade: document.getElementById("grade"),
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

function setBadge(text, variant) {
  el.resultBadge.style.display = "inline-flex";
  el.resultBadge.textContent = text;
  el.resultBadge.classList.remove("dg-badge--ok", "dg-badge--ng");
  if (variant === "ok") el.resultBadge.classList.add("dg-badge--ok");
  if (variant === "ng") el.resultBadge.classList.add("dg-badge--ng");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function render() {
  const q = state.list[state.index];
  if (!q) {
    el.question.innerHTML = "<div class=\"dg-note\">問題がありません。データJSONを確認してください。</div>";
    return;
  }

  el.explanation.innerHTML = "";
  el.resultBadge.style.display = "none";

  el.progress.textContent = `${state.index + 1} / ${state.list.length}`;
  renderQuestion(el.question, q, state);
}

function goto(i) {
  state.index = Math.max(0, Math.min(i, state.list.length - 1));
  render();
}

async function init() {
  el.status.textContent = "読込中...";

  state.all = await loadAllQuestions();
  state.bySection = groupBySection(state.all);

  const sections = Array.from(state.bySection.keys()).sort();
  el.section.innerHTML = sections.map((s) => `<option value="${s}">${s}</option>`).join("");

  el.status.textContent = `問題 ${state.all.length} 件`;
}

el.start.addEventListener("click", () => {
  const sec = el.section.value;
  const base = state.bySection.get(sec) || [];
  state.list = el.order.value === "random" ? shuffle(base) : [...base];
  state.index = 0;
  render();
});

el.prev.addEventListener("click", () => goto(state.index - 1));
el.next.addEventListener("click", () => goto(state.index + 1));

el.grade.addEventListener("click", () => {
  const q = state.list[state.index];
  const ua = state.answers?.[q.id];
  const g = gradeQuestion(q, ua);
  setBadge(g.ok ? "正解" : "不正解", g.ok ? "ok" : "ng");
});

el.showExplanation.addEventListener("click", () => {
  const q = state.list[state.index];
  el.explanation.innerHTML = "";
  renderExplanation(el.explanation, q);
});

init();

// 公開機能だが、表示用にログイン状態は出せる（任意）
const badge = document.createElement("span");
badge.className = "dg-badge";
document.querySelector(".dg-header__inner")?.appendChild(badge);
renderLoginStatus(badge);
