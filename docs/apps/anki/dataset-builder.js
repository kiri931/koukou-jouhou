function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
}

function showMsg(text, kind = 'info') {
  const box = $('msg');
  box.style.display = '';
  box.classList.remove('dg-note--danger', 'dg-note--success', 'dg-note--warning');
  if (kind === 'ok') box.classList.add('dg-note--success');
  if (kind === 'ng') box.classList.add('dg-note--danger');
  if (kind === 'warn') box.classList.add('dg-note--warning');
  box.textContent = text;
}

function hideMsg() {
  const box = $('msg');
  box.style.display = 'none';
  box.textContent = '';
}

function uuidv4() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // RFC4122 v4 fallback
  const bytes = new Uint8Array(16);
  (globalThis.crypto || window.msCrypto).getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseCommaList(s) {
  return String(s || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
}

function parseAnswers(s) {
  const raw = String(s || '').trim();
  if (!raw) return [];

  // まずは行区切り優先。行が1行だけならカンマも許可。
  const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (lines.length >= 2) return lines;

  const commas = raw.split(',').map(x => x.trim()).filter(Boolean);
  return commas;
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isUuidV4(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function nowIso() {
  return new Date().toISOString();
}

function cardFormTemplate(index) {
  const wrap = document.createElement('div');
  wrap.className = 'dg-card';
  wrap.dataset.cardForm = '1';

  wrap.innerHTML = `
    <div class="dg-card__body dg-prose">
      <div class="dg-row" style="justify-content: space-between; align-items: center;">
        <strong>カード ${index}</strong>
        <button type="button" class="dg-btn dg-btn--danger" data-remove>削除</button>
      </div>

      <div class="dg-field">
        <label class="dg-label">分野（topic・任意）</label>
        <input class="dg-input" type="text" data-topic placeholder="例：ネットワーク" />
      </div>

      <div class="dg-field">
        <label class="dg-label">問題文（question・必須）</label>
        <textarea class="dg-input" rows="2" data-question placeholder="例：IPアドレスの役割は？"></textarea>
      </div>

      <div class="dg-field">
        <label class="dg-label">正答候補（answers・必須）</label>
        <textarea class="dg-input" rows="2" data-answers placeholder="1行=1候補（推奨）\n例：ネットワーク上の機器を識別する番号"></textarea>
        <div class="dg-help">行区切り（推奨）／1行しかない場合はカンマ区切りも可</div>
      </div>

      <div class="dg-field">
        <label class="dg-label">解説（explanation・任意）</label>
        <textarea class="dg-input" rows="2" data-explanation></textarea>
      </div>

      <div class="dg-field">
        <label class="dg-label">タグ（任意）</label>
        <input class="dg-input" type="text" data-tags placeholder="例：ip, network" />
      </div>

      <div class="dg-field">
        <label class="dg-label">カードID（id・UUID v4）</label>
        <div class="dg-row">
          <input class="dg-input" type="text" data-id placeholder="自動生成" style="flex:1;" />
          <button class="dg-btn dg-btn--subtle" type="button" data-regen>再生成</button>
        </div>
        <div class="dg-help">通常は自動生成でOK（インポート要件：UUID v4）</div>
      </div>
    </div>
  `.trim();

  return wrap;
}

function renumberCards() {
  const cards = [...$('cards').querySelectorAll('[data-card-form]')];
  cards.forEach((card, i) => {
    const label = card.querySelector('strong');
    if (label) label.textContent = `カード ${i + 1}`;
  });
}

function ensureIdsForForms() {
  // datasetId
  const dsId = $('dsId');
  if (!dsId.value.trim()) dsId.value = uuidv4();

  // card ids
  const regen = $('regenCardIds').checked;
  const forms = [...$('cards').querySelectorAll('[data-card-form]')];
  for (const f of forms) {
    const idInput = f.querySelector('[data-id]');
    if (!idInput) continue;
    if (regen || !idInput.value.trim()) idInput.value = uuidv4();
  }
}

function buildDatasetFromForm() {
  hideMsg();

  ensureIdsForForms();

  const errors = [];
  const title = $('dsTitle').value.trim();
  if (!title) errors.push('タイトル（title）は必須です。');

  const datasetId = $('dsId').value.trim();
  if (!isUuidV4(datasetId)) errors.push('datasetId が UUID v4 ではありません。');

  const tags = parseCommaList($('dsTags').value);
  const description = $('dsDescription').value.trim();

  const autoTimestamps = $('autoTimestamps').checked;
  const ts = autoTimestamps ? nowIso() : null;

  const cardNodes = [...$('cards').querySelectorAll('[data-card-form]')];
  if (!cardNodes.length) errors.push('カードが0件です（最低1件必要）。');

  const cards = [];
  cardNodes.forEach((node, idx) => {
    const topic = node.querySelector('[data-topic]')?.value?.trim() || '';
    const question = node.querySelector('[data-question]')?.value ?? '';
    const answersRaw = node.querySelector('[data-answers]')?.value ?? '';
    const explanation = node.querySelector('[data-explanation]')?.value?.trim() || '';
    const cardTags = parseCommaList(node.querySelector('[data-tags]')?.value ?? '');
    const id = node.querySelector('[data-id]')?.value?.trim() || '';

    if (!isUuidV4(id)) errors.push(`カード${idx + 1}: id が UUID v4 ではありません。`);
    if (typeof question !== 'string' || !question.trim()) errors.push(`カード${idx + 1}: 問題文（question）が必須です。`);

    const answers = parseAnswers(answersRaw);
    if (!answers.length) errors.push(`カード${idx + 1}: 正答候補（answers）が1つ以上必要です。`);

    const card = {
      id,
      topic,
      question: String(question),
      answers,
      explanation,
      tags: cardTags,
    };

    if (autoTimestamps) {
      card.createdAt = ts;
      card.updatedAt = ts;
    }

    cards.push(card);
  });

  if (errors.length) {
    showMsg(errors.join('\n'), 'ng');
    throw new Error('validation');
  }

  return {
    schema: 'memory-dataset/v1',
    datasetId,
    title,
    description,
    tags,
    cards,
  };
}

function setOutput(jsonText) {
  const out = $('jsonOut');
  out.value = jsonText;
  $('downloadJson').disabled = !jsonText.trim();
  $('copyJson').disabled = !jsonText.trim();
}

function setMergeOutput(jsonText) {
  const out = $('mergeOut');
  out.value = jsonText;
  $('mergeDownload').disabled = !jsonText.trim();
}

function normalizeDatasetV1(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('JSONが不正です');
  if (raw.schema !== 'memory-dataset/v1') throw new Error('schemaが対応外です（memory-dataset/v1）');
  if (!isUuidV4(raw.datasetId)) throw new Error('datasetIdがUUID v4ではありません');
  if (typeof raw.title !== 'string' || !raw.title.trim()) throw new Error('titleがありません');
  if (!Array.isArray(raw.cards)) throw new Error('cardsが配列ではありません');

  const cards = raw.cards.map((c, i) => {
    if (!c || typeof c !== 'object') throw new Error(`card[${i}]が不正です`);
    if (!isUuidV4(c.id)) throw new Error(`card[${i}].idがUUID v4ではありません`);
    if (typeof c.question !== 'string') throw new Error(`card[${i}].questionが不正です`);
    if (!Array.isArray(c.answers) || !c.answers.length) throw new Error(`card[${i}].answersが不正です`);

    return {
      id: c.id,
      topic: typeof c.topic === 'string' ? c.topic : '',
      question: c.question,
      answers: c.answers.map(String),
      explanation: typeof c.explanation === 'string' ? c.explanation : '',
      tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
      createdAt: typeof c.createdAt === 'string' ? c.createdAt : null,
      updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : null,
    };
  });

  return {
    schema: 'memory-dataset/v1',
    datasetId: raw.datasetId,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : '',
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    cards,
  };
}

let mergeLoaded = [];

async function loadMergeInputs() {
  const datasets = [];
  const errors = [];

  // files
  const files = $('mergeFiles').files ? [...$('mergeFiles').files] : [];
  for (const f of files) {
    try {
      const text = await f.text();
      const raw = JSON.parse(text);
      datasets.push(normalizeDatasetV1(raw));
    } catch (e) {
      errors.push(`${f.name}: ${e?.message || e}`);
    }
  }

  // paste
  const pasted = $('mergePaste').value.trim();
  if (pasted) {
    try {
      // 1) まず JSON として parse できるなら、それを採用（配列もOK）
      const parsed = JSON.parse(pasted);
      if (Array.isArray(parsed)) {
        parsed.forEach((obj, i) => {
          try {
            datasets.push(normalizeDatasetV1(obj));
          } catch (e) {
            errors.push(`貼り付け[${i}]: ${e?.message || e}`);
          }
        });
      } else {
        datasets.push(normalizeDatasetV1(parsed));
      }
    } catch {
      // 2) ダメなら「空行で区切られた複数JSON」を試す
      const chunks = pasted
        .split(/\r?\n\s*\r?\n/)
        .map(x => x.trim())
        .filter(Boolean);

      for (let i = 0; i < chunks.length; i++) {
        try {
          datasets.push(normalizeDatasetV1(JSON.parse(chunks[i])));
        } catch (e) {
          errors.push(`貼り付け[${i}]: ${e?.message || e}`);
        }
      }
    }
  }

  mergeLoaded = datasets;

  const summary = $('mergeSummary');
  if (errors.length) {
    summary.style.display = '';
    summary.classList.remove('dg-note--success');
    summary.classList.add('dg-note--warning');
    summary.textContent = `読み込みエラーがあります（読み込めた分は結合可能）\n${errors.join('\n')}`;
  } else {
    summary.style.display = datasets.length ? '' : 'none';
    summary.classList.remove('dg-note--warning');
    summary.classList.add('dg-note--success');
    if (datasets.length) {
      const totalCards = datasets.reduce((a, d) => a + d.cards.length, 0);
      summary.textContent = `読み込み完了: ${datasets.length}件 / 総カード ${totalCards}件`;
    } else {
      summary.textContent = '';
    }
  }

  $('mergeBuild').disabled = !mergeLoaded.length;
  $('mergeDownload').disabled = true;
  $('mergeOut').value = '';
}

function buildMergedDataset() {
  if (!mergeLoaded.length) throw new Error('no merge inputs');

  const title = $('mergeTitle').value.trim();
  if (!title) throw new Error('結合後タイトル（必須）を入力してください。');

  const description = $('mergeDescription').value.trim();

  const mergeTagsRaw = $('mergeTags').value;
  let tags;
  if (mergeTagsRaw.trim()) tags = parseCommaList(mergeTagsRaw);
  else {
    const set = new Set();
    for (const ds of mergeLoaded) (ds.tags || []).forEach(t => set.add(String(t)));
    tags = [...set];
  }

  const datasetId = $('mergeRegenDatasetId').checked ? uuidv4() : (mergeLoaded[0]?.datasetId || uuidv4());

  const fixIds = $('mergeFixCardIds').checked;
  const used = new Set();
  const mergedCards = [];
  let regenerated = 0;

  for (const ds of mergeLoaded) {
    for (const c of ds.cards) {
      const card = { ...c };
      if (fixIds) {
        if (!isUuidV4(card.id) || used.has(card.id)) {
          card.id = uuidv4();
          regenerated++;
        }
      }
      used.add(card.id);
      mergedCards.push(card);
    }
  }

  const out = {
    schema: 'memory-dataset/v1',
    datasetId,
    title,
    description,
    tags,
    cards: mergedCards,
  };

  const summary = $('mergeSummary');
  summary.style.display = '';
  summary.classList.remove('dg-note--warning');
  summary.classList.add('dg-note--success');
  summary.textContent = `結合: ${mergeLoaded.length}件 → カード ${mergedCards.length}件（ID再生成 ${regenerated}件）`;

  return out;
}

function init() {
  // 初期ID
  $('dsId').value = uuidv4();

  // 初期カード 1枚
  $('addCard').addEventListener('click', () => {
    const cards = $('cards');
    const idx = cards.querySelectorAll('[data-card-form]').length + 1;
    const node = cardFormTemplate(idx);

    node.querySelector('[data-remove]')?.addEventListener('click', () => {
      node.remove();
      renumberCards();
    });

    node.querySelector('[data-regen]')?.addEventListener('click', () => {
      const idInput = node.querySelector('[data-id]');
      if (idInput) idInput.value = uuidv4();
    });

    const idInput = node.querySelector('[data-id]');
    if (idInput) idInput.value = uuidv4();

    cards.append(node);
  });

  $('regenDatasetId').addEventListener('click', () => {
    $('dsId').value = uuidv4();
  });

  $('buildJson').addEventListener('click', () => {
    try {
      const ds = buildDatasetFromForm();
      const json = JSON.stringify(ds, null, 2);
      setOutput(json);
      showMsg(`JSON作成: カード ${ds.cards.length}件`, 'ok');
    } catch (e) {
      if (String(e?.message || e) !== 'validation') showMsg(e?.message || String(e), 'ng');
    }
  });

  $('downloadJson').addEventListener('click', () => {
    const json = $('jsonOut').value;
    if (!json.trim()) return;
    downloadText('dataset.json', json);
  });

  $('copyJson').addEventListener('click', async () => {
    const json = $('jsonOut').value;
    if (!json.trim()) return;
    try {
      await navigator.clipboard.writeText(json);
      showMsg('コピーしました。', 'ok');
    } catch {
      showMsg('コピーに失敗しました（ブラウザの権限設定を確認）。', 'warn');
    }
  });

  // merge
  $('loadMerge').addEventListener('click', () => {
    loadMergeInputs().catch(e => {
      const summary = $('mergeSummary');
      summary.style.display = '';
      summary.classList.remove('dg-note--success');
      summary.classList.add('dg-note--warning');
      summary.textContent = `読み込み失敗: ${e?.message || e}`;
    });
  });

  $('mergeBuild').addEventListener('click', () => {
    try {
      const ds = buildMergedDataset();
      const json = JSON.stringify(ds, null, 2);
      setMergeOutput(json);
      $('mergeDownload').disabled = false;
    } catch (e) {
      const summary = $('mergeSummary');
      summary.style.display = '';
      summary.classList.remove('dg-note--success');
      summary.classList.add('dg-note--warning');
      summary.textContent = `結合できません: ${e?.message || e}`;
    }
  });

  $('mergeDownload').addEventListener('click', () => {
    const json = $('mergeOut').value;
    if (!json.trim()) return;
    downloadText('dataset.json', json);
  });

  // 初期カード1枚を作る
  $('addCard').click();
}

init();
