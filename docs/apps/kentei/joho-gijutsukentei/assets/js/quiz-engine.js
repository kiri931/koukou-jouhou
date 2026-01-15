import { richTextToHtml } from "./text.js";
import { renderMathIn } from "./katex-render.js";

export function renderQuestion(mountEl, question, state) {
  mountEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "dg-row";
  header.style.justifyContent = "space-between";

  const meta = document.createElement("div");
  meta.className = "dg-row";
  meta.innerHTML = `
    <span class="dg-badge">${question.section ?? ""}</span>
    <span class="dg-badge">${question.format}</span>
    ${question.language ? `<span class="dg-badge">${question.language}</span>` : ""}
  `;

  const id = document.createElement("div");
  id.className = "dg-badge";
  id.textContent = question.id;

  header.appendChild(meta);
  header.appendChild(id);

  const stem = document.createElement("div");
  stem.className = "dg-prose";
  stem.innerHTML = `<p>${richTextToHtml(question.stem ?? "")}</p>`;

  const form = document.createElement("form");
  form.className = "dg-stack";

  const answerBox = document.createElement("div");

  const name = `q_${question.id}`;
  const current = state.answers?.[question.id];

  if (question.format === "choice") {
    const choices = question.choices ?? [];
    const list = document.createElement("div");
    list.className = "dg-stack";

    choices.forEach((c, idx) => {
      const label = document.createElement("label");
      label.className = "dg-card";
      label.style.cursor = "pointer";

      const body = document.createElement("div");
      body.className = "dg-card__body";

      const checked = Number(current) === idx;
      body.innerHTML = `
        <div class="dg-row">
          <input type="radio" name="${name}" value="${idx}" ${checked ? "checked" : ""} />
          <div class="dg-prose"><strong>${String.fromCharCode(65 + idx)}.</strong> ${richTextToHtml(String(c))}</div>
        </div>
      `;
      label.appendChild(body);
      list.appendChild(label);
    });

    answerBox.appendChild(list);
  } else if (question.format === "number" || question.format === "text") {
    const field = document.createElement("div");
    field.className = "dg-field";
    field.innerHTML = `
      <label class="dg-label" for="${name}">回答</label>
      <input class="dg-input" id="${name}" name="${name}" type="${question.format === "number" ? "number" : "text"}" value="${current ? String(current) : ""}" />
    `;
    answerBox.appendChild(field);
  } else {
    answerBox.innerHTML = `<div class="dg-note dg-note--danger">未対応のformat: ${question.format}</div>`;
  }

  const footer = document.createElement("div");
  footer.className = "dg-row";

  const btnSave = document.createElement("button");
  btnSave.type = "submit";
  btnSave.className = "dg-btn";
  btnSave.textContent = "この問題を保存";

  const status = document.createElement("span");
  status.className = "dg-badge";
  status.style.display = "none";

  footer.appendChild(btnSave);
  footer.appendChild(status);

  form.appendChild(answerBox);
  form.appendChild(footer);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    let value = null;
    if (question.format === "choice") {
      const v = formData.get(name);
      value = v === null ? null : Number(v);
    } else {
      value = formData.get(name);
      if (typeof value === "string") value = value.trim();
    }

    state.answers = state.answers ?? {};
    state.answers[question.id] = value;

    status.style.display = "inline-flex";
    status.textContent = "保存しました";
    status.classList.remove("dg-badge--ng");
    status.classList.add("dg-badge--ok");
  });

  mountEl.appendChild(header);
  mountEl.appendChild(stem);
  mountEl.appendChild(form);

  renderMathIn(mountEl);
}

export function gradeQuestion(question, userAnswer) {
  if (question.format === "choice") {
    const correctIndex = Number(question.answer);
    const ok = Number(userAnswer) === correctIndex;
    return { ok, correct: correctIndex };
  }

  if (question.format === "text" || question.format === "number") {
    const correctText = String(question.answer_text ?? "").trim();
    const ua = String(userAnswer ?? "").trim();
    const ok = ua !== "" && ua === correctText;
    return { ok, correct: correctText };
  }

  return { ok: false, correct: null };
}

export function renderExplanation(mountEl, question) {
  const box = document.createElement("div");
  box.className = "dg-note dg-note--success";
  box.innerHTML = `<div class="dg-prose"><strong>解説</strong><div style="margin-top:8px">${richTextToHtml(question.explanation ?? "")}</div></div>`;
  mountEl.appendChild(box);
  renderMathIn(box);
}
