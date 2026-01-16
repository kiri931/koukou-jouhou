// Viewer for exported/submitted progress JSON files.
// Supports two shapes:
// 1) export: { version, exportedAt, items: { [step]: { html, css, js, updatedAt } } }
// 2) submit: { step, item: { html, css, js, updatedAt }, ... }

const THEME_STORAGE_KEY = 'shooting:learning:theme:v1';
const CM_THEME_STORAGE_KEY = 'shooting:learning:cmTheme:v1';

function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

function safeJsonParse(text, label = 'JSON') {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: `${label}の解析に失敗: ${err?.message || err}` };
  }
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return Array.from(value);
  } catch {
    return [];
  }
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function splitLines(text) {
  const s = String(text ?? '').replace(/\r\n?/g, '\n');
  return s.split('\n');
}

function myersDiffLines(aLines, bLines) {
  const a = Array.isArray(aLines) ? aLines : [];
  const b = Array.isArray(bLines) ? bLines : [];
  const N = a.length;
  const M = b.length;
  const max = N + M;

  let v = new Map();
  v.set(1, 0);
  const trace = [];

  for (let d = 0; d <= max; d++) {
    const vNext = new Map();
    for (let k = -d; k <= d; k += 2) {
      const vKMinus = v.get(k - 1);
      const vKPlus = v.get(k + 1);

      let x;
      if (k === -d || (k !== d && (vKMinus ?? -1) < (vKPlus ?? -1))) {
        x = vKPlus ?? 0;
      } else {
        x = (vKMinus ?? 0) + 1;
      }
      let y = x - k;

      while (x < N && y < M && a[x] === b[y]) {
        x++;
        y++;
      }

      vNext.set(k, x);
      if (x >= N && y >= M) {
        trace.push(vNext);
        return backtrackMyers(trace, a, b);
      }
    }
    trace.push(vNext);
    v = vNext;
  }

  return backtrackMyers(trace, a, b);
}

function backtrackMyers(trace, a, b) {
  let x = a.length;
  let y = b.length;
  const edits = [];

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    const vKMinus = v.get(k - 1);
    const vKPlus = v.get(k + 1);

    let prevK;
    if (k === -d || (k !== d && (vKMinus ?? -1) < (vKPlus ?? -1))) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v.get(prevK) ?? 0;
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({ type: 'equal', line: a[x - 1] });
      x--;
      y--;
    }

    if (d === 0) break;

    if (x === prevX) {
      edits.push({ type: 'add', line: b[y - 1] });
      y--;
    } else {
      edits.push({ type: 'del', line: a[x - 1] });
      x--;
    }
  }

  edits.reverse();
  return edits;
}

function renderDiffToElement(container, { beforeText, afterText }) {
  if (!container) return;

  const a = splitLines(beforeText);
  const b = splitLines(afterText);
  const ops = myersDiffLines(a, b);

  const onlyEmpty = a.length === 1 && a[0] === '' && b.length === 1 && b[0] === '';
  if (onlyEmpty) {
    container.innerHTML = '<div class="diffLine diffEq"><span class="diffSign"> </span><span>（差分なし）</span></div>';
    return;
  }

  const hasChange = ops.some((o) => o.type !== 'equal');
  if (!hasChange) {
    container.innerHTML = '<div class="diffLine diffEq"><span class="diffSign"> </span><span>（差分なし）</span></div>';
    return;
  }

  const escape = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const html = ops
    .map((o) => {
      if (o.type === 'add') {
        return `<div class="diffLine diffAdd"><span class="diffSign">+</span><span>${escape(o.line)}</span></div>`;
      }
      if (o.type === 'del') {
        return `<div class="diffLine diffDel"><span class="diffSign">-</span><span>${escape(o.line)}</span></div>`;
      }
      return `<div class="diffLine diffEq"><span class="diffSign"> </span><span>${escape(o.line)}</span></div>`;
    })
    .join('');
  container.innerHTML = html;
}

function normalizeStepKey(stepKey) {
  if (typeof stepKey === 'number') return `step${stepKey}`;
  if (typeof stepKey !== 'string') return '';
  if (/^step\d+$/.test(stepKey)) return stepKey;
  const m = stepKey.match(/(\d+)/);
  if (m) return `step${m[1]}`;
  return '';
}

function extractRecordsFromJson(json, sourceName) {
  /** @type {{step:string, item:{html?:string, css?:string, js?:string, updatedAt?:string}, sourceName:string}[]} */
  const records = [];

  if (!isObject(json)) return records;

  // export shape
  if (isObject(json.items)) {
    for (const [stepKey, item] of Object.entries(json.items)) {
      const step = normalizeStepKey(stepKey);
      if (!step || !isObject(item)) continue;
      records.push({
        step,
        item: {
          html: typeof item.html === 'string' ? item.html : '',
          css: typeof item.css === 'string' ? item.css : '',
          js: typeof item.js === 'string' ? item.js : '',
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
        },
        sourceName,
      });
    }
    return records;
  }

  // submit shape
  if (typeof json.step !== 'undefined' && isObject(json.item)) {
    const step = normalizeStepKey(json.step);
    if (!step) return records;
    const item = json.item;
    records.push({
      step,
      item: {
        html: typeof item.html === 'string' ? item.html : '',
        css: typeof item.css === 'string' ? item.css : '',
        js: typeof item.js === 'string' ? item.js : '',
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : '',
      },
      sourceName,
    });
    return records;
  }

  return records;
}

function stepNumber(step) {
  const m = String(step).match(/step(\d+)/);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

function createRowButton(text, subText, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'viewerRow';

  const title = document.createElement('div');
  title.className = 'viewerRowTitle';
  title.textContent = text;

  const sub = document.createElement('div');
  sub.className = 'viewerRowSub';
  sub.textContent = subText || '';

  btn.appendChild(title);
  btn.appendChild(sub);
  btn.addEventListener('click', onClick);
  return btn;
}

function setSelectedRow(container, rowEl) {
  for (const el of container.querySelectorAll('.viewerRow.isSelected')) {
    el.classList.remove('isSelected');
    el.setAttribute('aria-selected', 'false');
  }
  rowEl.classList.add('isSelected');
  rowEl.setAttribute('aria-selected', 'true');
}

function setupTabs({ onTabChange }) {
  const tabs = toArray(document.querySelectorAll('[data-view-tab]'));
  const panes = {
    html: document.getElementById('viewHtmlPane'),
    css: document.getElementById('viewCssPane'),
    js: document.getElementById('viewJsPane'),
  };

  function select(tabId) {
    for (const t of tabs) {
      const isActive = t.getAttribute('data-view-tab') === tabId;
      t.classList.toggle('isActive', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    if (panes.html) panes.html.hidden = tabId !== 'html';
    if (panes.css) panes.css.hidden = tabId !== 'css';
    if (panes.js) panes.js.hidden = tabId !== 'js';
    onTabChange(tabId);
  }

  for (const t of tabs) {
    t.addEventListener('click', () => select(t.getAttribute('data-view-tab')));
  }

  select('html');
}

function cmThemeToUrl(theme) {
  // Default: eclipse already loaded.
  if (!theme || theme === 'auto' || theme === 'eclipse') return null;
  return `https://cdn.jsdelivr.net/npm/codemirror@5.65.16/theme/${encodeURIComponent(theme)}.min.css`;
}

function getEffectiveTheme() {
  const effective = document.documentElement.dataset.themeEffective;
  if (effective === 'dark' || effective === 'light') return effective;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyEditorTheme({ cmEditors, cmThemeSelectValue }) {
  // theme.js handles page theme; this only chooses CodeMirror theme.
  const isDarkPage = getEffectiveTheme() === 'dark';
  let cmTheme = cmThemeSelectValue;
  if (cmTheme === 'auto') cmTheme = isDarkPage ? 'material-darker' : 'eclipse';

  const url = cmThemeToUrl(cmTheme);
  const link = document.getElementById('cmThemeLink');
  if (link && url) link.setAttribute('href', url);
  if (link && !url) {
    // keep eclipse link
    link.setAttribute('href', 'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/theme/eclipse.min.css');
  }

  for (const editor of cmEditors) {
    editor.setOption('theme', cmTheme);
  }

  // keep select in sync with storage
  if (cmThemeSelectValue) localStorage.setItem(CM_THEME_STORAGE_KEY, cmThemeSelectValue);
}

function initEditors() {
  const htmlTa = $('#viewHtml');
  const cssTa = $('#viewCss');
  const jsTa = $('#viewJs');

  const cmHtml = CodeMirror.fromTextArea(htmlTa, {
    mode: 'htmlmixed',
    lineNumbers: true,
    readOnly: true,
  });
  const cmCss = CodeMirror.fromTextArea(cssTa, {
    mode: 'css',
    lineNumbers: true,
    readOnly: true,
  });
  const cmJs = CodeMirror.fromTextArea(jsTa, {
    mode: 'javascript',
    lineNumbers: true,
    readOnly: true,
  });

  // Make them fill area.
  for (const cm of [cmHtml, cmCss, cmJs]) {
    cm.setSize('100%', '100%');
  }

  const htmlPane = cmHtml.getWrapperElement();
  const cssPane = cmCss.getWrapperElement();
  const jsPane = cmJs.getWrapperElement();

  htmlPane.id = 'viewHtmlPane';
  cssPane.id = 'viewCssPane';
  jsPane.id = 'viewJsPane';

  // Default: show HTML only.
  cssPane.hidden = true;
  jsPane.hidden = true;

  return { cmHtml, cmCss, cmJs };
}

function main() {
  const themeSelect = $('#themeSelect');
  const cmThemeSelect = $('#cmThemeSelect');
  const fileInput = $('#viewerFiles');
  const clearBtn = $('#clearBtn');
  const fileList = $('#fileList');
  const stepList = $('#stepList');
  const meta = $('#viewerMeta');
  const detailTitle = $('#detailTitle');
  const compareDetails = $('#compareDetails');
  const compareOld = $('#compareOld');
  const compareNew = $('#compareNew');
  const compareSwapBtn = $('#compareSwapBtn');
  const compareRefreshBtn = $('#compareRefreshBtn');
  const compareDiff = $('#compareDiff');
  const compareHint = $('#compareHint');

  // Load persisted theme preferences
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'auto';
  const savedCmTheme = localStorage.getItem(CM_THEME_STORAGE_KEY) || 'auto';
  themeSelect.value = savedTheme;
  cmThemeSelect.value = savedCmTheme;

  // Page theme via existing theme.js
  const { cmHtml, cmCss, cmJs } = initEditors();
  const cmEditors = [cmHtml, cmCss, cmJs];

  // Keep CodeMirror theme in sync
  applyEditorTheme({ cmEditors, cmThemeSelectValue: savedCmTheme });

  themeSelect.addEventListener('change', () => {
    // theme.js will apply and persist the page theme; we only react for CM theme auto.
    applyEditorTheme({ cmEditors, cmThemeSelectValue: cmThemeSelect.value });
  });
  cmThemeSelect.addEventListener('change', () => {
    applyEditorTheme({ cmEditors, cmThemeSelectValue: cmThemeSelect.value });
  });

  // React to theme.js updates (auto -> effective theme change)
  const themeObserver = new MutationObserver(() => {
    if ((cmThemeSelect.value || 'auto') === 'auto') {
      applyEditorTheme({ cmEditors, cmThemeSelectValue: 'auto' });
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme-effective', 'data-themeEffective'] });

  /** @type {{name:string, records: ReturnType<typeof extractRecordsFromJson> , raw:any, error?:string}[]} */
  const loadedFiles = [];
  /** @type {{step:string, records:{fileIndex:number, recordIndex:number}[]}[]} */
  let groupedSteps = [];

  let selected = {
    fileIndex: -1,
    recordIndex: -1,
    tab: 'html',
  };

  /** @type {{ step: string, refs: {fileIndex:number, recordIndex:number, t:number, label:string}[] } | null} */
  let compareContext = null;

  function renderMeta(record) {
    if (!record) {
      meta.textContent = '';
      return;
    }
    const updatedAt = formatDateTime(record.item.updatedAt);
    meta.textContent = `${record.sourceName} / ${record.step}${updatedAt ? ` / 更新: ${updatedAt}` : ''}`;
  }

  function showRecord(fileIndex, recordIndex) {
    selected.fileIndex = fileIndex;
    selected.recordIndex = recordIndex;

    const record = loadedFiles[fileIndex]?.records?.[recordIndex];
    if (!record) return;

    detailTitle.textContent = `${record.step} / ${record.sourceName}`;

    cmHtml.setValue(record.item.html || '');
    cmCss.setValue(record.item.css || '');
    cmJs.setValue(record.item.js || '');

    // Refresh for hidden->shown
    setTimeout(() => {
      cmHtml.refresh();
      cmCss.refresh();
      cmJs.refresh();
    }, 0);

    renderMeta(record);

    updateCompareForStep(record.step);
  }

  function getCompareRefsForStep(step) {
    /** @type {{fileIndex:number, recordIndex:number, t:number, label:string}[]} */
    const refs = [];

    for (let fi = 0; fi < loadedFiles.length; fi++) {
      for (let ri = 0; ri < loadedFiles[fi].records.length; ri++) {
        const rec = loadedFiles[fi].records[ri];
        if (rec.step !== step) continue;
        const t = rec.item?.updatedAt ? new Date(rec.item.updatedAt).getTime() : 0;
        const when = formatDateTime(rec.item?.updatedAt) || '更新時刻なし';
        const label = `${when} / ${rec.sourceName}`;
        refs.push({ fileIndex: fi, recordIndex: ri, t: Number.isFinite(t) ? t : 0, label });
      }
    }

    refs.sort((a, b) => {
      if (a.t !== b.t) return a.t - b.t; // old -> new
      return a.label.localeCompare(b.label);
    });

    return refs;
  }

  function setCompareVisibility(visible) {
    compareDetails.hidden = !visible;
    if (!visible) {
      compareDiff.innerHTML = '';
      compareHint.textContent = '';
    }
  }

  function fillCompareSelect(selectEl, refs, selectedValue) {
    selectEl.innerHTML = '';
    refs.forEach((ref, index) => {
      const opt = document.createElement('option');
      opt.value = `${ref.fileIndex}:${ref.recordIndex}`;
      opt.textContent = `#${index + 1} ${ref.label}`;
      selectEl.appendChild(opt);
    });
    if (selectedValue) selectEl.value = selectedValue;
  }

  function readRefFromSelect(value) {
    const m = String(value || '').match(/^(\d+):(\d+)$/);
    if (!m) return null;
    return { fileIndex: Number(m[1]), recordIndex: Number(m[2]) };
  }

  function getRecordByRef(ref) {
    if (!ref) return null;
    const rec = loadedFiles[ref.fileIndex]?.records?.[ref.recordIndex];
    return rec || null;
  }

  function computeDefaultCompareSelection(refs, step) {
    // Default: compare around currently selected record when possible.
    const selectedKey = `${selected.fileIndex}:${selected.recordIndex}`;
    const keys = refs.map((r) => `${r.fileIndex}:${r.recordIndex}`);
    const idx = keys.indexOf(selectedKey);

    if (idx >= 0) {
      const newIdx = idx;
      const oldIdx = newIdx > 0 ? newIdx - 1 : (refs.length > 1 ? 0 : -1);
      const oldKey = oldIdx >= 0 ? keys[oldIdx] : '';
      const newKey = keys[newIdx];
      if (oldKey && oldKey !== newKey) return { oldKey, newKey };
      if (refs.length >= 2) return { oldKey: keys[0], newKey: keys[1] };
      return { oldKey: keys[0] || '', newKey: keys[0] || '' };
    }

    // Otherwise: oldest vs newest
    if (refs.length >= 2) return { oldKey: keys[0], newKey: keys[keys.length - 1] };
    return { oldKey: keys[0] || '', newKey: keys[0] || '' };
  }

  function renderCompareDiff() {
    if (!compareContext) return;

    const oldRef = readRefFromSelect(compareOld.value);
    const newRef = readRefFromSelect(compareNew.value);
    const oldRec = getRecordByRef(oldRef);
    const newRec = getRecordByRef(newRef);

    if (!oldRec || !newRec) {
      compareDiff.innerHTML = '<div class="diffLine diffEq"><span class="diffSign"> </span><span>（比較対象がありません）</span></div>';
      compareHint.textContent = '';
      return;
    }

    const tab = selected.tab;
    const beforeText = tab === 'css' ? oldRec.item.css : tab === 'js' ? oldRec.item.js : oldRec.item.html;
    const afterText = tab === 'css' ? newRec.item.css : tab === 'js' ? newRec.item.js : newRec.item.html;

    renderDiffToElement(compareDiff, { beforeText, afterText });

    const oldWhen = formatDateTime(oldRec.item.updatedAt) || '更新時刻なし';
    const newWhen = formatDateTime(newRec.item.updatedAt) || '更新時刻なし';
    const label = tab === 'css' ? 'CSS' : tab === 'js' ? 'JavaScript' : 'HTML';
    compareHint.textContent = `${compareContext.step} / ${label} / 旧: ${oldWhen} → 新: ${newWhen}`;
  }

  function updateCompareForStep(step) {
    if (!step) {
      compareContext = null;
      setCompareVisibility(false);
      return;
    }

    const refs = getCompareRefsForStep(step);
    if (refs.length < 2) {
      compareContext = { step, refs };
      setCompareVisibility(false);
      return;
    }

    compareContext = { step, refs };
    setCompareVisibility(true);

    const defaults = computeDefaultCompareSelection(refs, step);
    fillCompareSelect(compareOld, refs, defaults.oldKey);
    fillCompareSelect(compareNew, refs, defaults.newKey);

    renderCompareDiff();
  }

  function rebuildStepGroups() {
    /** @type {Map<string, {step:string, records:{fileIndex:number, recordIndex:number}[]}>} */
    const map = new Map();

    for (let fi = 0; fi < loadedFiles.length; fi++) {
      for (let ri = 0; ri < loadedFiles[fi].records.length; ri++) {
        const rec = loadedFiles[fi].records[ri];
        if (!map.has(rec.step)) map.set(rec.step, { step: rec.step, records: [] });
        map.get(rec.step).records.push({ fileIndex: fi, recordIndex: ri });
      }
    }

    groupedSteps = [...map.values()].sort((a, b) => stepNumber(a.step) - stepNumber(b.step));
  }

  function renderFileList() {
    fileList.innerHTML = '';

    if (loadedFiles.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'viewerEmpty';
      empty.textContent = 'ここに読み込んだファイルが表示されます。';
      fileList.appendChild(empty);
      return;
    }

    loadedFiles.forEach((f, index) => {
      const count = f.records.length;
      const sub = f.error
        ? `読み込み失敗: ${f.error}`
        : `${count}件${count ? `（${f.records.map(r => r.step).join(', ')}）` : ''}`;

      const btn = createRowButton(f.name, sub, () => {
        // Select first record of that file, if any
        setSelectedRow(fileList, btn);
        if (count > 0) showRecord(index, 0);
        renderStepList(index);
      });

      fileList.appendChild(btn);
    });
  }

  function renderStepList(filterFileIndex = -1) {
    stepList.innerHTML = '';

    const stepsToShow = groupedSteps
      .map(group => {
        const refs = group.records.filter(ref => (filterFileIndex < 0 ? true : ref.fileIndex === filterFileIndex));
        return { step: group.step, refs };
      })
      .filter(x => x.refs.length > 0);

    if (stepsToShow.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'viewerEmpty';
      empty.textContent = filterFileIndex < 0 ? 'ステップがありません。' : 'このファイルにはステップがありません。';
      stepList.appendChild(empty);
      return;
    }

    stepsToShow.forEach(group => {
      const btn = createRowButton(group.step, `${group.refs.length}件`, () => {
        setSelectedRow(stepList, btn);
        // Select the newest-ish by updatedAt within this step
        const best = group.refs
          .map(ref => {
            const rec = loadedFiles[ref.fileIndex]?.records?.[ref.recordIndex];
            return { ref, t: rec?.item?.updatedAt ? new Date(rec.item.updatedAt).getTime() : 0 };
          })
          .sort((a, b) => b.t - a.t)[0];
        if (best) showRecord(best.ref.fileIndex, best.ref.recordIndex);
      });
      stepList.appendChild(btn);
    });
  }

  async function addFiles(fileListLike) {
    const files = toArray(fileListLike);
    if (files.length === 0) return;

    for (const file of files) {
      const name = file.name || 'unknown.json';
      let text = '';
      try {
        text = await file.text();
      } catch (err) {
        loadedFiles.push({ name, records: [], raw: null, error: String(err?.message || err) });
        continue;
      }

      const parsed = safeJsonParse(text, name);
      if (!parsed.ok) {
        loadedFiles.push({ name, records: [], raw: null, error: parsed.error });
        continue;
      }

      const raw = parsed.value;
      const records = extractRecordsFromJson(raw, name);
      loadedFiles.push({ name, records, raw });
    }

    rebuildStepGroups();
    renderFileList();
    renderStepList();

    // Auto-select first available record
    for (let fi = 0; fi < loadedFiles.length; fi++) {
      if (loadedFiles[fi].records.length > 0) {
        showRecord(fi, 0);
        break;
      }
    }
  }

  fileInput.addEventListener('change', async () => {
    await addFiles(fileInput.files);
    fileInput.value = '';
  });

  clearBtn.addEventListener('click', () => {
    loadedFiles.length = 0;
    groupedSteps = [];
    selected.fileIndex = -1;
    selected.recordIndex = -1;

    renderFileList();
    renderStepList();
    detailTitle.textContent = '内容';
    cmHtml.setValue('');
    cmCss.setValue('');
    cmJs.setValue('');
    renderMeta(null);
  });

  setupTabs({
    onTabChange: (tabId) => {
      selected.tab = tabId;
      setTimeout(() => {
        if (tabId === 'html') cmHtml.refresh();
        if (tabId === 'css') cmCss.refresh();
        if (tabId === 'js') cmJs.refresh();
      }, 0);

      if (!compareDetails.hidden) renderCompareDiff();
    },
  });

  compareOld.addEventListener('change', renderCompareDiff);
  compareNew.addEventListener('change', renderCompareDiff);
  compareRefreshBtn.addEventListener('click', renderCompareDiff);
  compareSwapBtn.addEventListener('click', () => {
    const a = compareOld.value;
    compareOld.value = compareNew.value;
    compareNew.value = a;
    renderCompareDiff();
  });

  renderFileList();
  renderStepList();

  // Drag & drop
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;
    await addFiles(dt.files);
  });
}

main();
