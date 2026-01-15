import { fetchJson, assertArray } from "./data-loader.js";

const KENTEI_BASE_URL = new URL("../../../", import.meta.url);

function kenteiUrl(path) {
  return new URL(path, KENTEI_BASE_URL).toString();
}

export async function loadQuestionIndex() {
  return await fetchJson(kenteiUrl("data/questions/index.json"));
}

export async function loadAllQuestions() {
  const index = await loadQuestionIndex();
  const files = assertArray(index.files, "questions/index.json: files must be array");

  const results = [];
  for (const f of files) {
    const list = await fetchJson(kenteiUrl(`data/questions/${f}`));
    if (!Array.isArray(list)) throw new Error(`${f} must be an array`);
    results.push(...list);
  }

  // PDF参照モード用の問題（source.type === "pdf"）は、
  // 公開の演習/模擬試験では混ざらないよう除外する。
  return results.filter((q) => (q?.source?.type || "original") !== "pdf");
}

export function groupBySection(questions) {
  const map = new Map();
  for (const q of questions) {
    const key = q.section || "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(q);
  }
  return map;
}
