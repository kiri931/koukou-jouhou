// practice専用のデータローダー
// data/practice/mondai1.json, mondai2.json, mondai3.json, mondai4.json を読み込んで統合

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return await res.json();
}

// mondai1.json: 基本用語問題
async function loadMondai1() {
  try {
    const data = await fetchJson("../data/practice/mondai1.json");
    return data.map((q) => ({
      id: `m1-${q.id}`,
      section: "基本用語",
      format: "choice",
      stem: q.question,
      choices: q.options,
      answer: q.answer,
      source: { type: "mondai1", originalId: q.id },
    }));
  } catch (error) {
    console.warn("mondai1.json の読み込みに失敗しました:", error);
    return [];
  }
}

// mondai2.json: 計算・論理回路
async function loadMondai2() {
  try {
    const data = await fetchJson("../data/practice/mondai2.json");
    return data.map((q) => ({
      id: `m2-${q.id}`,
      section: "計算・論理回路",
      format: "choice",
      stem: q.question,
      choices: q.options,
      answer: q.answer,
      source: { type: "mondai2", originalId: q.id },
    }));
  } catch (error) {
    console.warn("mondai2.json の読み込みに失敗しました:", error);
    return [];
  }
}

// mondai3.json: フローチャート問題
async function loadMondai3() {
  try {
    const data = await fetchJson("../data/practice/mondai3.json");
    return data.map((q) => ({
      id: `m3-${q.id}`,
      section: "フローチャート",
      format: "flowchart",
      title: q.title,
      stem: q.description,
      flowSteps: q.flow_steps,
      choices: q.choices,
      answers: q.answers,
      category: q.category,
      source: { type: "mondai3", originalId: q.id },
    }));
  } catch (error) {
    console.warn("mondai3.json の読み込みに失敗しました:", error);
    return [];
  }
}

// mondai4.json: プログラミング問題
async function loadMondai4() {
  try {
    const data = await fetchJson("../data/practice/mondai4.json");
    return data.map((q) => ({
      id: `m4-${q.id}`,
      section: "プログラミング",
      format: "programming",
      title: q.title,
      stem: q.description,
      programC: q.program_c,
      programBasic: q.program_basic,
      choices: q.choices,
      answers: q.answers,
      source: { type: "mondai4", originalId: q.id },
    }));
  } catch (error) {
    console.warn("mondai4.json の読み込みに失敗しました:", error);
    return [];
  }
}

export async function loadAllPracticeQuestions() {
  const [m1, m2, m3, m4] = await Promise.all([
    loadMondai1(),
    loadMondai2(),
    loadMondai3(),
    loadMondai4(),
  ]);
  return [...m1, ...m2, ...m3, ...m4];
}

export function groupBySection(questions) {
  const map = new Map();
  for (const q of questions) {
    const key = q.section || "その他";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(q);
  }
  return map;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
