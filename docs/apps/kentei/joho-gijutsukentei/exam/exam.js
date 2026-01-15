import { buildExamSet, startTimer, gradeExam, exportExamCsv } from "../assets/js/exam-runner.js";
import { renderQuestion, renderExplanation } from "../assets/js/quiz-engine.js";
import { renderLoginStatus } from "../assets/js/app-shell.js";

const el = {
  timer: document.getElementById("timer"),
  progress: document.getElementById("progress"),
  warn: document.getElementById("warn"),
  prev: document.getElementById("prev"),
  next: document.getElementById("next"),
  submit: document.getElementById("submit"),
  question: document.getElementById("question"),
  after: document.getElementById("after"),
  score: document.getElementById("score"),
  downloadCsv: document.getElementById("downloadCsv"),
};

const state = {
  config: null,
  questions: [],
  index: 0,
  answers: {},
  timer: null,
  result: null,
};

function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function render() {
  const q = state.questions[state.index];
  el.after.innerHTML = "";

  el.progress.textContent = `${state.index + 1} / ${state.questions.length}`;
  renderQuestion(el.question, q, state);

  if (state.result) {
    renderExplanation(el.after, q);
  }
}

function goto(i) {
  state.index = Math.max(0, Math.min(i, state.questions.length - 1));
  render();
}

function showWarn(text) {
  el.warn.style.display = "inline-flex";
  el.warn.textContent = text;
}

async function init() {
  const { config, questions, warnings } = await buildExamSet();
  state.config = config;
  state.questions = questions;

  if (warnings.length) {
    showWarn(warnings.join(" / "));
  }

  state.timer = startTimer(config.time_limit_minutes ?? 50, ({ remain }) => {
    el.timer.textContent = formatClock(remain);
    if (remain <= 0) {
      // 時間切れ提出
      submit();
    }
  });

  goto(0);
}

el.prev.addEventListener("click", () => goto(state.index - 1));
el.next.addEventListener("click", () => goto(state.index + 1));

function submit() {
  if (state.result) return;

  state.timer?.stop?.();

  const result = gradeExam(state.questions, state.answers);
  state.result = result;

  el.score.textContent = `得点: ${result.score}点（${result.correct}/${result.total}） 合格点: ${state.config.pass_score}`;
  el.score.classList.add(result.score >= state.config.pass_score ? "dg-badge--ok" : "dg-badge--ng");

  el.downloadCsv.disabled = false;

  // 提出後はその場の問題に解説も出せる
  el.after.innerHTML = "";
  renderExplanation(el.after, state.questions[state.index]);
}

el.submit.addEventListener("click", submit);

el.downloadCsv.addEventListener("click", () => {
  if (!state.result) return;
  exportExamCsv({ config: state.config, result: state.result });
});

init();

// 任意: ログイン状態表示
const badge = document.createElement("span");
badge.className = "dg-badge";
document.querySelector(".dg-header__inner")?.appendChild(badge);
renderLoginStatus(badge);
