// ========================================
// Utils
// ========================================

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function richTextToHtml(s) {
  return escapeHtml(s).replaceAll("\n", "<br>");
}

function renderMathIn(el) {
  if (typeof window.renderMathInElement !== "function") return;
  window.renderMathInElement(el, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
    throwOnError: false,
  });
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return await res.json();
}

// ========================================
// CSV Export
// ========================================

function escapeCsvCell(value) {
  const s = String(value ?? "");
  if (/[\n\r",]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function toCsv(rows) {
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n";
}

function downloadCsv(filename, rows, { bom = true } = {}) {
  const csv = toCsv(rows);
  const content = bom ? "\ufeff" + csv : csv;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

// ========================================
// PDF Mode Logic
// ========================================

async function loadPdfList() {
  return await fetchJson("./data/pdf_list.json");
}

async function loadPdfQuestions() {
  // 両方のファイルを読み込んで結合
  try {
    const [refQuestions, ipaQuestions] = await Promise.all([
      fetchJson("./data/pdf_ref.json").catch(() => []),
      fetchJson("./data/ipa_questions.json").catch(() => [])
    ]);
    return [...refQuestions, ...ipaQuestions];
  } catch (e) {
    console.error("Failed to load questions:", e);
    return [];
  }
}

const ANSWER_DATA_BY_PDF = {
  "ipa-2025r07-ip": "./data/ipa_answers7.json",
  "ipa-2024r06-ip": "./data/ipa_answers6.json",
  "fe-2023r05-a-short": "./data/it_answers5a.json",
  "fe-2023r05-b-short": "./data/it_answers5b.json",
};

async function loadAnswerDataForPdf(pdfId) {
  const path = ANSWER_DATA_BY_PDF[pdfId];
  if (!path) return null;
  try {
    return await fetchJson(path);
  } catch (e) {
    console.error("Failed to load answers:", e);
    return null;
  }
}

function buildViewerUrl(filePath, page = 1) {
  const params = new URLSearchParams();
  params.set("file", filePath);
  params.set("page", String(page));
  return `./viewer.html?${params.toString()}`;
}

function renderPdfList(mountEl, pdfList) {
  mountEl.innerHTML = "";

  const tabs = document.createElement("div");
  tabs.className = "dg-tabs";

  const tabList = document.createElement("div");
  tabList.className = "dg-tabs__list";
  tabList.setAttribute("role", "tablist");

  for (const p of pdfList) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "dg-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", "false");
    tab.dataset.tab = p.id;
    tab.textContent = p.title;
    tabList.appendChild(tab);
  }

  const tabPanel = document.createElement("div");
  tabPanel.className = "dg-tabs__panel";
  tabPanel.id = "pdfTabPanel";
  tabPanel.innerHTML = '<div class="dg-help">PDFを選択してください。</div>';

  tabs.appendChild(tabList);
  tabs.appendChild(tabPanel);
  mountEl.appendChild(tabs);
}

function isIpaPdfUrl(url) {
  return typeof url === "string" && url.includes("ipa.go.jp");
}

function openPdfUrlInNewTab(filePath, page = 1) {
  if (isIpaPdfUrl(filePath)) {
    window.open(filePath, "_blank");
    return;
  }
  window.open(buildViewerUrl(filePath, page), "_blank");
}

function loadTestPdfWithFallback(filePath, page) {
  if (!el.testPdfViewer) return;

  const iframe = el.testPdfViewer;
  const openInNewTab = () => openPdfUrlInNewTab(filePath, page);
  let settled = false;

  const showFallback = () => {
    if (settled) return;
    settled = true;
    iframe.src = "about:blank";
    if (el.testPdfNotice) el.testPdfNotice.hidden = false;
    if (el.openTestPdfNewTab) el.openTestPdfNewTab.onclick = openInNewTab;
    openInNewTab();
  };

  const showEmbedded = () => {
    if (settled) return;
    settled = true;
    if (el.testPdfNotice) el.testPdfNotice.hidden = true;
  };

  if (el.testPdfNotice) el.testPdfNotice.hidden = true;
  if (el.openTestPdfNewTab) el.openTestPdfNewTab.onclick = openInNewTab;

  iframe.addEventListener(
    "load",
    () => {
      let href = "";
      try {
        href = iframe.contentWindow?.location?.href || "";
      } catch (e) {
        showEmbedded();
        return;
      }
      if (!href || href === "about:blank") {
        showFallback();
        return;
      }
      showEmbedded();
    },
    { once: true }
  );

  iframe.addEventListener("error", showFallback, { once: true });

  iframe.src = buildViewerUrl(filePath, page);
  setTimeout(showFallback, 5000);
}

function getScopeText(pdf) {
  const scopes = Array.isArray(pdf.scopes) ? pdf.scopes : [];
  if (!scopes.length) return "-";
  return scopes
    .map((s) => {
      const from = s.pageFrom ? `p.${s.pageFrom}` : "";
      const to = s.pageTo ? `p.${s.pageTo}` : "";
      const range = from || to ? `${from}${to ? `〜${to}` : ""}` : "（未設定）";
      return `${s.label}: ${range}`;
    })
    .join("<br>");
}

function renderPdfTabPanel(pdf) {
  const panel = document.getElementById("pdfTabPanel");
  if (!panel) return;
  if (!pdf) {
    panel.innerHTML = '<div class="dg-help">PDFを選択してください。</div>';
    return;
  }

  const scopeText = getScopeText(pdf);
  panel.innerHTML = `
    <div class="dg-stack">
      <div class="dg-row" style="flex-wrap:wrap; gap:12px; align-items:center">
        <div>
          <div class="dg-page-title" style="font-size:var(--dg-text-lg); margin:0">${richTextToHtml(pdf.title)}</div>
          <div class="dg-help">id: ${richTextToHtml(pdf.id)}</div>
        </div>
        <button class="dg-btn" type="button" data-open="${pdf.id}">別タブで開く</button>
      </div>
      <div class="dg-help">${richTextToHtml(pdf.note ?? "")}</div>
      <div class="dg-help">${scopeText}</div>
    </div>
  `;
}

function setActivePdfTab(pdfId) {
  const tabs = el.pdfList?.querySelectorAll(".dg-tab") ?? [];
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === pdfId;
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.classList.toggle("is-active", isActive);
  });

  const pdf = state.pdfList.find((item) => item.id === pdfId);
  renderPdfTabPanel(pdf ?? null);
}

function renderPdfQuestions(mountEl, pdfQuestions) {
  mountEl.innerHTML = "";

  if (!pdfQuestions.length) {
    mountEl.innerHTML = `<div class="dg-note">このPDFに紐づく問題がまだありません。</div>`;
    return;
  }

  const table = document.createElement("table");
  table.className = "dg-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>問</th>
        <th>参照</th>
        <th>回答</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  for (const q of pdfQuestions) {
    const tr = document.createElement("tr");
    const page = q.source?.page ?? "";
    const label = q.source?.label ?? q.id;

    let answerHtml = "";
    if (q.format === "choice" && Array.isArray(q.choices)) {
      answerHtml = '<div class="dg-row" style="gap:8px">';
      for (const choice of q.choices) {
        answerHtml += `
          <label style="display:flex; align-items:center; gap:4px; cursor:pointer">
            <input type="radio" name="answer-${q.id}" value="${choice}" data-answer-id="${q.id}" />
            <span>${choice}</span>
          </label>
        `;
      }
      answerHtml += "</div>";
    } else {
      answerHtml = `<input class="dg-input" style="max-width:160px" data-answer-id="${q.id}" placeholder="例: A / 3 / 10" />`;
    }

    tr.innerHTML = `
      <td>${richTextToHtml(label)}</td>
      <td>
        <span class="dg-badge">p.${page}</span>
        <div class="dg-help">${richTextToHtml(q.stem ?? "")}</div>
      </td>
      <td>
        ${answerHtml}
      </td>
    `;

    tbody.appendChild(tr);
  }

  mountEl.appendChild(table);
  renderMathIn(mountEl);
}

function exportPdfAnswersCsv(pdfId, questions, answers) {
  const rows = [["pdfId", "label", "page", "questionId", "answer"]];
  for (const q of questions) {
    rows.push([
      pdfId,
      q.source?.label ?? "",
      q.source?.page ?? "",
      q.id,
      answers[q.id] ?? "",
    ]);
  }

  return rows;
}

function gradeAnswers() {
  if (!state.answerData || !state.current) return;
  
  const answerMap = {};
  for (const a of state.answerData.answers) {
    answerMap[a.q] = a.answer;
  }
  
  let correct = 0;
  let total = 0;
  const results = [];
  
  for (const q of state.currentQuestions) {
    const questionNum = parseInt(q.source?.label?.replace(/[^0-9]/g, '') || '0');
    const userAnswer = state.answers[q.id];
    const correctAnswer = answerMap[questionNum];
    
    if (correctAnswer) {
      total++;
      if (userAnswer === correctAnswer) {
        correct++;
        results.push({ q: questionNum, status: 'correct', userAnswer, correctAnswer });
      } else {
        results.push({ q: questionNum, status: 'wrong', userAnswer: userAnswer || '未回答', correctAnswer });
      }
    }
  }
  
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  el.gradingResult.innerHTML = `
    <div class="dg-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 16px">
      <div style="text-align: center">
        <div style="font-size: 48px; font-weight: bold; margin-bottom: 8px">${score}点</div>
        <div style="font-size: 18px; opacity: 0.9">正答数: ${correct} / ${total}</div>
      </div>
    </div>
  `;
  
  // テストモードでは不正解を表示しない
  if (!state.testMode) {
    // 不正解をハイライト
    el.pdfQuestions.querySelectorAll('tr').forEach((tr, index) => {
      const result = results[index];
      if (result) {
        if (result.status === 'correct') {
          tr.style.backgroundColor = '#d4edda';
        } else if (result.status === 'wrong') {
          tr.style.backgroundColor = '#f8d7da';
          const answerCell = tr.querySelector('td:last-child');
          if (answerCell && !answerCell.querySelector('.correct-answer-hint')) {
            const hint = document.createElement('div');
            hint.className = 'correct-answer-hint dg-help';
            hint.style.marginTop = '4px';
            hint.style.color = '#721c24';
            hint.textContent = `正解: ${result.correctAnswer}`;
            answerCell.appendChild(hint);
          }
        }
      }
    });
  }
  
  return { score, correct, total, results };
}

function startTestMode() {
  if (!state.current || !state.answerData) return;
  
  if (!confirm('テストモードを開始しますか？\n\n・左側にPDF、右側に問題が表示されます\n・他のタブやウィンドウを開くと記録されます\n・終了後は結果ファイルを提出してください')) {
    return;
  }
  
  state.testMode = true;
  state.testStartTime = new Date();
  state.testTabSwitches = 0;
  state.answers = {};
  
  // レイアウト切り替え
  el.normalHeader.style.display = 'none';
  el.normalMain.style.display = 'none';
  el.testHeader.style.display = 'block';
  el.testModeContainer.style.display = 'block';
  
  // 画面サイズを計算して設定
  updateTestLayout();
  
  // PDFをiframeに読み込む（ブロックされたら別タブへ自動フォールバック）
  const jumpPage = Number(state.scope?.pageFrom || "1");
  loadTestPdfWithFallback(state.current.path, jumpPage);
  
  // 問題をシンプルに表示
  renderTestQuestions();
  
  // タイマー開始
  updateTimer();
  state.testTimer = setInterval(updateTimer, 1000);
  
  // タブ切り替えを監視
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // ウィンドウリサイズ時にレイアウトを再計算
  window.addEventListener('resize', updateTestLayout);
}

function updateTestLayout() {
  if (!el.testHeader || !el.testMainGrid) return;
  
  const headerHeight = el.testHeader.offsetHeight || 56;
  const availableHeight = window.innerHeight - headerHeight;
  
  el.testMainGrid.style.height = `${availableHeight}px`;
}

function updateTimer() {
  if (!state.testStartTime) return;
  const elapsed = Math.floor((new Date() - state.testStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  el.testTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderTestQuestions() {
  el.testQuestions.innerHTML = '';
  
  for (const q of state.currentQuestions) {
    const questionNum = q.source?.label || q.id;
    const page = q.source?.page ?? '';
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'dg-test-question';
    
    let choicesHtml = '';
    if (q.format === 'choice' && Array.isArray(q.choices)) {
      for (const choice of q.choices) {
        choicesHtml += `
          <label class="dg-test-choice">
            <input type="radio" name="answer-${q.id}" value="${choice}" data-answer-id="${q.id}" />
            <span>${choice}</span>
          </label>
        `;
      }
    } else {
      choicesHtml = `<input class="dg-input dg-test-input" data-answer-id="${q.id}" placeholder="回答を入力" />`;
    }
    
    questionDiv.innerHTML = `
      <div class="dg-test-question__meta">
        <strong>${questionNum}</strong>
        <span class="dg-badge">p.${page}</span>
      </div>
      ${choicesHtml}
    `;
    
    el.testQuestions.appendChild(questionDiv);
  }
  
  // 回答の監視
  el.testQuestions.querySelectorAll('[data-answer-id]').forEach((input) => {
    const eventType = input.type === 'radio' ? 'change' : 'input';
    input.addEventListener(eventType, () => {
      state.answers[input.dataset.answerId] = input.value;
    });
  });
}

function handleVisibilityChange() {
  // document.hiddenがtrueの時だけカウント（ページが完全に非表示になった場合）
  if (state.testMode && document.hidden) {
    state.testTabSwitches++;
    if (el.tabSwitchCounter) {
      el.tabSwitchCounter.textContent = `切替: ${state.testTabSwitches}回`;
    }
    console.log('Tab switch detected:', state.testTabSwitches);
  }
}

function handleWindowBlur() {
  // blur イベントは削除（iframe内のクリックでも発火するため）
  // visibilitychange のみで検出する
}

function cancelTestMode() {
  if (!state.testMode) return;
  if (!confirm('テストモードを中止しますか？\n\n現在の回答は破棄されます。')) {
    return;
  }

  if (state.testTimer) {
    clearInterval(state.testTimer);
    state.testTimer = null;
  }

  state.testMode = false;
  state.testStartTime = null;
  state.testTabSwitches = 0;
  state.answers = {};

  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('resize', updateTestLayout);

  el.testHeader.style.display = 'none';
  el.testModeContainer.style.display = 'none';
  el.normalHeader.style.display = 'block';
  el.normalMain.style.display = 'block';
}

function endTestMode() {
  if (!confirm('テストを終了して提出しますか？')) {
    return;
  }
  
  const testEndTime = new Date();
  const gradingResult = gradeAnswers();
  
  if (!gradingResult) {
    alert('採点に失敗しました');
    return;
  }
  
  // タイマー停止
  if (state.testTimer) {
    clearInterval(state.testTimer);
    state.testTimer = null;
  }
  
  // 結果ファイルを生成
  const resultData = {
    version: "1.0",
    examId: state.current.id,
    examTitle: state.current.title,
    scope: state.scope?.label || "all",
    studentAnswers: state.answers,
    score: gradingResult.score,
    correct: gradingResult.correct,
    total: gradingResult.total,
    startTime: state.testStartTime.toISOString(),
    endTime: testEndTime.toISOString(),
    tabSwitches: state.testTabSwitches,
    userAgent: navigator.userAgent,
    // 簡易的なハッシュ（改ざん検出用）
    checksum: btoa(JSON.stringify({
      score: gradingResult.score,
      startTime: state.testStartTime.toISOString(),
      endTime: testEndTime.toISOString(),
      answers: Object.keys(state.answers).length
    }))
  };
  
  // JSONファイルをダウンロード
  const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  a.download = `test-result-${state.current.id}-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  
  // テストモードを終了
  state.testMode = false;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('resize', updateTestLayout);
  
  // UIを元に戻す
  el.testHeader.style.display = 'none';
  el.testModeContainer.style.display = 'none';
  el.normalHeader.style.display = 'block';
  el.normalMain.style.display = 'block';
  
  alert(`テスト終了\n\n得点: ${gradingResult.score}点\n正答数: ${gradingResult.correct}/${gradingResult.total}\nタブ切り替え: ${state.testTabSwitches}回\n\n結果ファイルをダウンロードしました。提出してください。`);
}

// ========================================
// Main App
// ========================================

const el = {
  pdfList: document.getElementById("pdfList"),
  openPdf: document.getElementById("openPdf"),
  openAnswerPdf: document.getElementById("openAnswerPdf"),
  startTest: document.getElementById("startTest"),
  currentPdf: document.getElementById("currentPdf"),
  scope: document.getElementById("scope"),
  answerSection: document.getElementById("answerSection"),
  scopeNote: document.getElementById("scopeNote"),
  pdfQuestions: document.getElementById("pdfQuestions"),
  grading: document.getElementById("grading"),
  gradingResult: document.getElementById("gradingResult"),
  testModeWarning: document.getElementById("testModeWarning"),
  export: document.getElementById("export"),
  exportStatus: document.getElementById("exportStatus"),
  // テストモード用
  normalHeader: document.getElementById("normalHeader"),
  normalMain: document.getElementById("normalMain"),
  testHeader: document.getElementById("testHeader"),
  testModeContainer: document.getElementById("testModeContainer"),
  testPdfViewer: document.getElementById("testPdfViewer"),
  testPdfNotice: document.getElementById("testPdfNotice"),
  openTestPdfNewTab: document.getElementById("openTestPdfNewTab"),
  testQuestions: document.getElementById("testQuestions"),
  testQuestionsContainer: document.getElementById("testQuestionsContainer"),
  testMainGrid: document.getElementById("testMainGrid"),
  submitTestHeader: document.getElementById("submitTestHeader"),
  cancelTest: document.getElementById("cancelTest"),
  testTimer: document.getElementById("testTimer"),
  tabSwitchCounter: document.getElementById("tabSwitchCounter"),
};

const state = {
  pdfList: [],
  pdfQuestions: [],
  answerData: null,
  current: null,
  scope: null,
  currentQuestions: [],
  answers: {},
  testMode: false,
  testStartTime: null,
  testTabSwitches: 0,
  testTimer: null,
};

function normalizeScopes(pdf) {
  const scopes = Array.isArray(pdf?.scopes) ? pdf.scopes : [];
  if (scopes.length) return scopes;
  return [{ id: "all", label: "全体", questionCount: 50, pageFrom: null, pageTo: null, note: "" }];
}

function buildPlaceholderQuestions(pdfId, scope, count) {
  const n = Math.max(1, Number(count || 50));
  const scopeId = scope?.id ?? "all";
  const isChoice = pdfId.startsWith("ipa-") || pdfId.startsWith("fe-");
  const list = [];
  for (let i = 1; i <= n; i++) {
    const item = {
      id: `pdf-${pdfId}-${scopeId}-${String(i).padStart(2, "0")}`,
      format: isChoice ? "choice" : "text",
      stem: "",
      source: { type: "pdf", pdfId, page: "", label: `問${i}` },
    };
    if (isChoice) {
      item.choices = ["ア", "イ", "ウ", "エ"];
    }
    list.push(item);
  }
  return list;
}

function openPdfInNewTab(page) {
  if (!state.current) return;
  openPdfUrlInNewTab(state.current.path, page);
}

function openAnswerPdfInNewTab() {
  if (!state.current || !state.current.answerPath) return;
  openPdfUrlInNewTab(state.current.answerPath, 1);
}

function scrollToAnswerSection() {
  if (!el.answerSection) return;
  el.answerSection.scrollIntoView({ behavior: "smooth", block: "start" });
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
  
  // PDFを開くボタンを有効化
  el.openPdf.disabled = false;
  el.openPdf.onclick = () => openPdfInNewTab(jumpPage);
  
  // 解答PDFボタンの有効化
  if (state.current.answerPath) {
    el.openAnswerPdf.disabled = false;
    el.openAnswerPdf.onclick = () => openAnswerPdfInNewTab();
  } else {
    el.openAnswerPdf.disabled = true;
  }

  const matched = state.pdfQuestions.filter((q) => q.source?.pdfId === state.current.id);
  state.currentQuestions = matched.length
    ? matched
    : buildPlaceholderQuestions(state.current.id, next, next.questionCount ?? 50);

  renderPdfQuestions(el.pdfQuestions, state.currentQuestions);

  state.answers = {};
  el.export.disabled = false;
  el.grading.disabled = state.answerData ? false : true;
  el.startTest.disabled = state.answerData ? false : true;
  el.exportStatus.textContent = `${state.currentQuestions.length}問`;
  el.gradingResult.innerHTML = '';

  // ハイライトをリセット
  el.pdfQuestions.querySelectorAll('tr').forEach((tr) => {
    tr.style.backgroundColor = '';
  });

  // 回答入力の監視（テキスト入力とラジオボタンの両方に対応）
  el.pdfQuestions.querySelectorAll("[data-answer-id]").forEach((input) => {
    const eventType = input.type === 'radio' ? 'change' : 'input';
    input.addEventListener(eventType, () => {
      state.answers[input.dataset.answerId] = input.value;
    });
  });
}

function setCurrentPdf(pdf) {
  state.current = pdf;
  el.currentPdf.textContent = `${pdf.title} (${pdf.id})`;
  setActivePdfTab(pdf.id);

  const scopes = normalizeScopes(pdf);
  el.scope.innerHTML = scopes.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
  setCurrentScope(scopes[0]?.id);

  state.answerData = null;
  el.grading.disabled = true;
  el.startTest.disabled = true;

  loadAnswerDataForPdf(pdf.id).then((data) => {
    if (state.current?.id !== pdf.id) return;
    state.answerData = data;
    el.grading.disabled = !state.answerData;
    el.startTest.disabled = !state.answerData;
  });
}

async function init() {
  state.pdfList = await loadPdfList();
  state.pdfQuestions = await loadPdfQuestions();
  state.answerData = null;

  renderPdfList(el.pdfList, state.pdfList);

  el.pdfList.addEventListener("click", (e) => {
    const tab = e.target.closest("button[data-tab]");
    if (tab) {
      const pdf = state.pdfList.find((p) => p.id === tab.dataset.tab);
      if (pdf) setCurrentPdf(pdf);
      return;
    }

    const btn = e.target.closest("button[data-open]");
    if (!btn) return;
    const id = btn.dataset.open;
    const pdf = state.pdfList.find((p) => p.id === id);
    if (!pdf) return;
    setCurrentPdf(pdf);
    openPdfUrlInNewTab(pdf.path, pdf.scopes?.[0]?.pageFrom || 1);
    scrollToAnswerSection();
  });
}

el.scope.addEventListener("change", () => {
  if (!state.current) return;
  setCurrentScope(el.scope.value);
});

el.startTest.addEventListener("click", () => {
  startTestMode();
});

el.submitTestHeader.addEventListener("click", () => {
  endTestMode();
});

el.cancelTest.addEventListener("click", () => {
  cancelTestMode();
});

el.grading.addEventListener("click", () => {
  gradeAnswers();
});

el.export.addEventListener("click", () => {
  if (!state.current) return;
  const exportId = state.scope ? `${state.current.id}-${state.scope.id}` : state.current.id;
  const rows = exportPdfAnswersCsv(exportId, state.currentQuestions, state.answers);

  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  downloadCsv(`pdf-${exportId}-${stamp}.csv`, rows, { bom: true });
  el.exportStatus.textContent = "出力しました";
});

init();
