// practice専用のレンダリングエンジン

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function dispatch(container, type, detail) {
  container.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
}

function extractChoiceLabel(choiceText) {
  // "ア. ..." / "イ. ..." の先頭ラベルを取り出す
  const m = String(choiceText).match(/^\s*([^\.\s]+)\s*\./);
  return m ? m[1] : String(choiceText).trim();
}

function sortedBlankKeysFromAnswers(answersObj) {
  if (!answersObj || typeof answersObj !== "object") return [];
  return Object.keys(answersObj)
    .filter((k) => answersObj[k] !== "null")
    .sort((a, b) => Number(a) - Number(b));
}

function sortedBlankKeysFromFlowSteps(flowSteps) {
  const keys = new Set();
  (flowSteps || []).forEach((s) => {
    if (s?.blank_id !== undefined && s?.blank_id !== null && s?.blank_id !== "") {
      keys.add(String(s.blank_id));
    }
  });
  return Array.from(keys).sort((a, b) => Number(a) - Number(b));
}

// 基本用語問題（choice形式）
function renderChoiceQuestion(container, question, state) {
  const stem = document.createElement("div");
  stem.className = "dg-prose";
  stem.innerHTML = `<p><strong>${escapeHtml(question.stem)}</strong></p>`;

  const form = document.createElement("form");
  form.className = "dg-stack";
  form.style.marginTop = "16px";

  const name = `q_${question.id}`;
  const current = state.answers?.[question.id];

  question.choices.forEach((choice, idx) => {
    const label = document.createElement("label");
    label.className = "dg-card";
    label.style.cursor = "pointer";

    const body = document.createElement("div");
    body.className = "dg-card__body";

    const checked = Number(current) === idx;
    const letter = String.fromCharCode(65 + idx);

    body.innerHTML = `
      <div class="dg-row">
        <input type="radio" name="${name}" value="${idx}" ${checked ? "checked" : ""} />
        <div><strong>${letter}.</strong> ${escapeHtml(choice)}</div>
      </div>
    `;

    label.appendChild(body);
    form.appendChild(label);
  });

  // choiceは、選んだ瞬間に回答保存＆自動採点
  form.addEventListener("change", () => {
    const formData = new FormData(form);
    const value = formData.get(name);
    if (value === null) return;
    state.answers[question.id] = Number(value);
    const g = gradeQuestion(question, state.answers[question.id]);
    dispatch(container, "practice:graded", g);
  });

  container.appendChild(stem);
  container.appendChild(form);
}

// フローチャート問題
function renderFlowchartQuestion(container, question, state) {
  const header = document.createElement("div");
  header.className = "dg-prose";
  header.innerHTML = `
    <h3>${escapeHtml(question.title)}</h3>
    <p>${escapeHtml(question.stem)}</p>
  `;

  const flowDiv = document.createElement("div");
  flowDiv.className = "dg-card";
  flowDiv.style.marginTop = "16px";
  flowDiv.style.padding = "16px";
  flowDiv.style.backgroundColor = "#f8f9fa";

  const flowContent = document.createElement("div");
  flowContent.style.fontFamily = "monospace";
  flowContent.style.fontSize = "14px";

  question.flowSteps.forEach((step) => {
    const line = document.createElement("div");
    line.style.padding = "4px 0";
    
    if (step.blank_id) {
      line.innerHTML = `➜ <span style="background:#ffffcc;padding:2px 6px;font-weight:bold">[${step.blank_id}]</span> ${escapeHtml(step.label)}`;
    } else {
      line.textContent = `  ${step.label}`;
    }
    
    flowContent.appendChild(line);
  });

  flowDiv.appendChild(flowContent);

  const blankKeys = sortedBlankKeysFromFlowSteps(question.flowSteps);
  const blankCount = blankKeys.length;

  const answerCard = document.createElement("div");
  answerCard.className = "dg-card";
  answerCard.style.marginTop = "16px";
  const answerBody = document.createElement("div");
  answerBody.className = "dg-card__body";
  const answerTitle = document.createElement("div");
  answerTitle.className = "dg-prose";
  answerTitle.innerHTML = "<h4 style=\"margin:0\">解答欄（押した順）</h4>";
  const answerSlots = document.createElement("div");
  answerSlots.className = "dg-row";
  answerSlots.style.flexWrap = "wrap";
  answerSlots.style.gap = "8px";
  answerSlots.style.marginTop = "12px";

  function getSeq() {
    const v = state.answers?.[question.id];
    return Array.isArray(v) ? v : [];
  }

  function renderSlots() {
    const seq = getSeq();
    answerSlots.innerHTML = "";
    for (let i = 0; i < blankCount; i++) {
      const k = blankKeys[i];
      const v = seq[i] ?? "-";
      const b = document.createElement("span");
      b.className = "dg-badge";
      b.textContent = `[${k}] ${v}`;
      answerSlots.appendChild(b);
    }
    if (!blankCount) {
      const b = document.createElement("span");
      b.className = "dg-badge";
      b.textContent = "（空欄なし）";
      answerSlots.appendChild(b);
    }
  }

  answerBody.appendChild(answerTitle);
  answerBody.appendChild(answerSlots);
  answerCard.appendChild(answerBody);

  const choicesDiv = document.createElement("div");
  choicesDiv.className = "dg-prose";
  choicesDiv.style.marginTop = "16px";
  choicesDiv.innerHTML = "<h4>選択肢（押した順に記録）</h4>";

  const choiceList = document.createElement("div");
  choiceList.className = "dg-stack";

  question.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dg-btn dg-btn--subtle";
    btn.style.justifyContent = "flex-start";
    btn.textContent = choice;

    btn.addEventListener("click", () => {
      if (!blankCount) return;
      const seq = getSeq();
      if (seq.length >= blankCount) return;
      const label = extractChoiceLabel(choice);
      const next = [...seq, label];
      state.answers[question.id] = next;
      renderSlots();

      if (next.length === blankCount) {
        const g = gradeQuestion(question, next);
        dispatch(container, "practice:graded", g);
      }
    });

    const wrap = document.createElement("div");
    wrap.appendChild(btn);
    choiceList.appendChild(wrap);
  });

  choicesDiv.appendChild(choiceList);

  container.appendChild(header);
  container.appendChild(flowDiv);
  container.appendChild(answerCard);
  container.appendChild(choicesDiv);
  renderSlots();
}

// プログラミング問題
function renderProgrammingQuestion(container, question, state) {
  const header = document.createElement("div");
  header.className = "dg-prose";
  header.innerHTML = `
    <h3>${escapeHtml(question.title)}</h3>
    <p>${escapeHtml(question.stem)}</p>
  `;

  const tabs = document.createElement("div");
  tabs.className = "dg-row";
  tabs.style.marginTop = "16px";
  tabs.style.gap = "8px";

  const btnC = document.createElement("button");
  btnC.type = "button";
  btnC.className = "dg-btn dg-btn--subtle";
  btnC.textContent = "C言語";
  btnC.dataset.lang = "c";

  const btnBasic = document.createElement("button");
  btnBasic.type = "button";
  btnBasic.className = "dg-btn dg-btn--subtle";
  btnBasic.textContent = "BASIC";
  btnBasic.dataset.lang = "basic";

  tabs.appendChild(btnC);
  tabs.appendChild(btnBasic);

  const codeDiv = document.createElement("div");
  codeDiv.className = "dg-card";
  codeDiv.style.marginTop = "16px";
  codeDiv.style.backgroundColor = "#1e1e1e";
  codeDiv.style.color = "#d4d4d4";
  codeDiv.style.padding = "16px";
  codeDiv.style.borderRadius = "4px";
  codeDiv.style.overflowX = "auto";

  const codeContent = document.createElement("pre");
  codeContent.style.margin = "0";
  codeContent.style.fontFamily = "monospace";
  codeContent.style.fontSize = "13px";
  codeContent.style.lineHeight = "1.5";

  function showCode(lang) {
    const program = lang === "c" ? question.programC : question.programBasic;
    codeContent.textContent = program.join("\n");
    
    btnC.classList.toggle("dg-btn--primary", lang === "c");
    btnBasic.classList.toggle("dg-btn--primary", lang === "basic");
  }

  btnC.addEventListener("click", () => showCode("c"));
  btnBasic.addEventListener("click", () => showCode("basic"));

  codeDiv.appendChild(codeContent);

  const blankKeys = sortedBlankKeysFromAnswers(question.answers);
  const blankCount = blankKeys.length;

  const answerCard = document.createElement("div");
  answerCard.className = "dg-card";
  answerCard.style.marginTop = "16px";
  const answerBody = document.createElement("div");
  answerBody.className = "dg-card__body";
  const answerTitle = document.createElement("div");
  answerTitle.className = "dg-prose";
  answerTitle.innerHTML = "<h4 style=\"margin:0\">解答欄（押した順）</h4>";
  const answerSlots = document.createElement("div");
  answerSlots.className = "dg-row";
  answerSlots.style.flexWrap = "wrap";
  answerSlots.style.gap = "8px";
  answerSlots.style.marginTop = "12px";

  function getSeq() {
    const v = state.answers?.[question.id];
    return Array.isArray(v) ? v : [];
  }

  function renderSlots() {
    const seq = getSeq();
    answerSlots.innerHTML = "";
    for (let i = 0; i < blankCount; i++) {
      const k = blankKeys[i];
      const v = seq[i] ?? "-";
      const b = document.createElement("span");
      b.className = "dg-badge";
      b.textContent = `[${k}] ${v}`;
      answerSlots.appendChild(b);
    }
    if (!blankCount) {
      const b = document.createElement("span");
      b.className = "dg-badge";
      b.textContent = "（空欄なし）";
      answerSlots.appendChild(b);
    }
  }

  answerBody.appendChild(answerTitle);
  answerBody.appendChild(answerSlots);
  answerCard.appendChild(answerBody);

  const choicesDiv = document.createElement("div");
  choicesDiv.className = "dg-prose";
  choicesDiv.style.marginTop = "16px";
  choicesDiv.innerHTML = "<h4>選択肢（押した順に記録）</h4>";

  const choiceList = document.createElement("div");
  choiceList.className = "dg-stack";

  question.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dg-btn dg-btn--subtle";
    btn.style.justifyContent = "flex-start";
    btn.textContent = choice;

    btn.addEventListener("click", () => {
      if (!blankCount) return;
      const seq = getSeq();
      if (seq.length >= blankCount) return;
      const label = extractChoiceLabel(choice);
      const next = [...seq, label];
      state.answers[question.id] = next;
      renderSlots();

      if (next.length === blankCount) {
        const g = gradeQuestion(question, next);
        dispatch(container, "practice:graded", g);
      }
    });

    const wrap = document.createElement("div");
    wrap.appendChild(btn);
    choiceList.appendChild(wrap);
  });

  choicesDiv.appendChild(choiceList);

  container.appendChild(header);
  container.appendChild(tabs);
  container.appendChild(codeDiv);
  container.appendChild(answerCard);
  container.appendChild(choicesDiv);

  // 初期表示
  showCode("c");
  renderSlots();
}

// メインレンダリング関数
export function renderQuestion(container, question, state) {
  container.innerHTML = "";

  const headerDiv = document.createElement("div");
  headerDiv.className = "dg-row";
  headerDiv.style.justifyContent = "space-between";
  headerDiv.style.marginBottom = "16px";

  const metaDiv = document.createElement("div");
  metaDiv.className = "dg-row";
  metaDiv.innerHTML = `
    <span class="dg-badge">${escapeHtml(question.section)}</span>
    <span class="dg-badge">${escapeHtml(question.format)}</span>
  `;

  const idDiv = document.createElement("div");
  idDiv.className = "dg-badge";
  idDiv.textContent = question.id;

  headerDiv.appendChild(metaDiv);
  headerDiv.appendChild(idDiv);
  container.appendChild(headerDiv);

  const contentDiv = document.createElement("div");

  if (question.format === "choice") {
    renderChoiceQuestion(contentDiv, question, state);
  } else if (question.format === "flowchart") {
    renderFlowchartQuestion(contentDiv, question, state);
  } else if (question.format === "programming") {
    renderProgrammingQuestion(contentDiv, question, state);
  } else {
    contentDiv.innerHTML = `<div class="dg-note dg-note--danger">未対応のformat: ${question.format}</div>`;
  }

  container.appendChild(contentDiv);
}

// 採点
export function gradeQuestion(question, userAnswer) {
  if (question.format === "choice") {
    const correctIndex = question.choices.findIndex((c) => c === question.answer);
    return {
      ok: userAnswer === correctIndex,
      correct: question.answer,
      userAnswer: userAnswer !== undefined ? question.choices[userAnswer] : null,
    };
  }

  if (question.format === "flowchart") {
    const blankKeys = sortedBlankKeysFromFlowSteps(question.flowSteps);
    const seq = Array.isArray(userAnswer) ? userAnswer : [];
    if (!blankKeys.length) return { ok: null, message: "空欄がないため採点できません" };
    if (seq.length < blankKeys.length) return { ok: null, message: "解答が未完成です" };

    let ok = true;
    for (let i = 0; i < blankKeys.length; i++) {
      const k = blankKeys[i];
      const expected = question.answers?.[k];
      const actual = seq[i];
      if (expected !== actual) {
        ok = false;
        break;
      }
    }

    return { ok };
  }

  if (question.format === "programming") {
    const blankKeys = sortedBlankKeysFromAnswers(question.answers);
    const seq = Array.isArray(userAnswer) ? userAnswer : [];
    if (!blankKeys.length) return { ok: null, message: "空欄がないため採点できません" };
    if (seq.length < blankKeys.length) return { ok: null, message: "解答が未完成です" };

    let ok = true;
    for (let i = 0; i < blankKeys.length; i++) {
      const k = blankKeys[i];
      const expected = question.answers?.[k];
      const actual = seq[i];
      if (expected !== actual) {
        ok = false;
        break;
      }
    }

    return { ok };
  }

  return { ok: null, message: "未対応の問題形式です" };
}

// 解説表示
export function renderExplanation(container, question) {
  container.innerHTML = "";

  const card = document.createElement("div");
  card.className = "dg-card";

  const body = document.createElement("div");
  body.className = "dg-card__body";

  if (question.format === "choice") {
    body.innerHTML = `
      <div class="dg-prose">
        <h4>正解</h4>
        <p><strong>${escapeHtml(question.answer)}</strong></p>
      </div>
    `;
  } else if (question.format === "flowchart") {
    const ans = Object.entries(question.answers)
      .map(([k, v]) => `[${k}] → <strong>${escapeHtml(v)}</strong>`)
      .join("<br>");
    body.innerHTML = `
      <div class="dg-prose">
        <h4>正解</h4>
        <p>${ans}</p>
      </div>
    `;
  } else if (question.format === "programming") {
    const ans = Object.entries(question.answers)
      .filter(([k, v]) => v !== "null")
      .map(([k, v]) => `[${k}] → <strong>${escapeHtml(v)}</strong>`)
      .join("<br>");
    body.innerHTML = `
      <div class="dg-prose">
        <h4>正解</h4>
        <p>${ans || "（解答なし）"}</p>
      </div>
    `;
  }

  card.appendChild(body);
  container.appendChild(card);
}
