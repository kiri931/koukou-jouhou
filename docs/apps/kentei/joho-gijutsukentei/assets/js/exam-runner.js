import { fetchJson } from "./data-loader.js";
import { loadAllQuestions, groupBySection } from "./question-bank.js";
import { gradeQuestion } from "./quiz-engine.js";
import { downloadCsv } from "./csv-export.js";

const KENTEI_BASE_URL = new URL("../../../", import.meta.url);

function kenteiUrl(path) {
  return new URL(path, KENTEI_BASE_URL).toString();
}

export async function loadExamConfig() {
  return await fetchJson(kenteiUrl("data/exam_config.json"));
}

function pickRandom(list, count) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export async function buildExamSet() {
  const config = await loadExamConfig();
  const all = await loadAllQuestions();

  const bySection = groupBySection(all);
  const picked = [];
  const warnings = [];

  for (const section of config.sections || []) {
    const pool = bySection.get(section.id) || [];

    let filtered = pool;
    if (section.language) {
      filtered = pool.filter((q) => (q.language || "") === section.language);
    }

    const selected = pickRandom(filtered, section.count || 0);
    if (selected.length < (section.count || 0)) {
      warnings.push(`${section.name}: 問題数が不足（${selected.length}/${section.count}）`);
    }

    picked.push(...selected);
  }

  return { config, questions: picked, warnings };
}

export function startTimer(minutes, onTick) {
  const totalSec = Math.max(0, Math.floor(minutes * 60));
  const start = Date.now();

  const timer = {
    stop: null,
  };

  const tick = () => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const remain = Math.max(0, totalSec - elapsed);
    onTick({ remain, elapsed, total: totalSec });
    if (remain <= 0) {
      clearInterval(handle);
      timer.stop = null;
    }
  };

  tick();
  const handle = setInterval(tick, 250);
  timer.stop = () => clearInterval(handle);

  return timer;
}

export function gradeExam(questions, answers) {
  let correct = 0;
  const rows = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const user = answers?.[q.id];
    const g = gradeQuestion(q, user);
    if (g.ok) correct++;

    rows.push({
      index: i + 1,
      id: q.id,
      section: q.section,
      format: q.format,
      userAnswer: user ?? "",
      correctAnswer: g.correct ?? "",
      ok: g.ok ? 1 : 0,
      pdfId: q.source?.pdfId ?? "",
      page: q.source?.page ?? "",
      label: q.source?.label ?? "",
    });
  }

  const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  return { correct, total: questions.length, score, rows };
}

export function exportExamCsv({ config, result }) {
  const header = [
    "No",
    "id",
    "section",
    "format",
    "userAnswer",
    "correctAnswer",
    "ok",
    "pdfId",
    "page",
    "label",
  ];

  const rows = [header];
  for (const r of result.rows) {
    rows.push([
      r.index,
      r.id,
      r.section,
      r.format,
      r.userAnswer,
      r.correctAnswer,
      r.ok,
      r.pdfId,
      r.page,
      r.label,
    ]);
  }

  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const filename = `it3-grade${config.grade}-exam-${stamp}.csv`;
  downloadCsv(filename, rows, { bom: true });
}
