import { fetchJson } from "./data-loader.js";
import { richTextToHtml } from "./text.js";
import { renderMathIn } from "./katex-render.js";

const KENTEI_BASE_URL = new URL("../../../", import.meta.url);

function kenteiUrl(path) {
  return new URL(path, KENTEI_BASE_URL).toString();
}

export async function loadPdfList() {
  return await fetchJson(kenteiUrl("data/pdf_list.json"));
}

export async function loadPdfQuestions() {
  // PDF参照モードの問題は、問題文の転載を避けるため stem は短くし、source にメタ情報を持たせる。
  return await fetchJson(kenteiUrl("data/questions/pdf_ref.json"));
}

export function buildViewerUrl(filePath, page = 1) {
  const params = new URLSearchParams();
  params.set("file", filePath);
  params.set("page", String(page));
  const viewer = new URL("vendor/pdfjs/viewer.html", KENTEI_BASE_URL);
  return `${viewer.pathname}?${params.toString()}`;
}

export function renderPdfList(mountEl, pdfList) {
  mountEl.innerHTML = "";

  const table = document.createElement("table");
  table.className = "dg-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>PDF</th>
        <th>メモ</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  for (const p of pdfList) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${p.title}</strong><div class="dg-help">id: ${p.id}</div></td>
      <td>${richTextToHtml(p.note ?? "")}</td>
      <td><button class="dg-btn dg-btn--subtle" type="button" data-open="${p.id}">開く</button></td>
    `;
    tbody.appendChild(tr);
  }

  mountEl.appendChild(table);
}

export function renderPdfQuestions(mountEl, pdfQuestions) {
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

    tr.innerHTML = `
      <td>${richTextToHtml(label)}</td>
      <td>
        <div class="dg-row">
          <span class="dg-badge">p.${page}</span>
          <button class="dg-btn dg-btn--subtle" type="button" data-jump-page="${page}">そのページへ</button>
        </div>
        <div class="dg-help">${richTextToHtml(q.stem ?? "")}</div>
      </td>
      <td>
        <input class="dg-input" style="max-width:160px" data-answer-id="${q.id}" placeholder="例: A / 3 / 10" />
      </td>
    `;

    tbody.appendChild(tr);
  }

  mountEl.appendChild(table);
  renderMathIn(mountEl);
}

export function exportPdfAnswersCsv(pdfId, questions, answers) {
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
