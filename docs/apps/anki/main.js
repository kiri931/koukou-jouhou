import { openDb } from './storage/db.js';
import { importDatasetJson, exportProgressJson, importProgressJson } from './storage/io.js';
import { fmtDateTimeLocal, nowIso, parseDateInputToIso } from './util/time.js';
import { normalizeAnswer, scoreAnswer } from './util/answer.js';
import { selectNextCard } from './util/queue.js';
import { fsrsScheduleNext } from './util/fsrs.js';

const state = {
  db: null,
  route: 'home',
  activeDatasetId: null,
  session: null,
};

function $(sel) {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, k);
    else if (v === false || v == null) {
      // skip
    } else node.setAttribute(k, String(v));
  }
  for (const child of children) node.append(child);
  return node;
}

function setRouteFromHash() {
  const raw = (location.hash || '#home').slice(1);
  const route = raw.split('?')[0] || 'home';
  state.route = route;
}

async function boot() {
  state.db = await openDb();
  await ensurePersistStorage();

  setRouteFromHash();
  window.addEventListener('hashchange', () => {
    setRouteFromHash();
    render();
  });

  // 初期: 直近のdatasetをアクティブにする
  const datasets = await state.db.listDatasets();
  if (datasets.length) state.activeDatasetId = datasets[0].datasetId;

  render();
}

async function ensurePersistStorage() {
  try {
    if (!('storage' in navigator) || !('persist' in navigator.storage)) return;
    const persisted = await navigator.storage.persisted();
    if (!persisted) await navigator.storage.persist();
  } catch {
    // ignore
  }
}

function render() {
  const app = $('#app');
  app.replaceChildren();

  if (state.route === 'home') app.append(renderHome());
  else if (state.route === 'study') renderStudy(app);
  else if (state.route === 'dashboard') renderDashboard(app);
  else if (state.route === 'data') renderData(app);
  else if (state.route === 'settings') renderSettings(app);
  else app.append(renderNotFound());

  // ナビの現在地（簡易）
  document.querySelectorAll('[data-route]').forEach(a => {
    const href = a.getAttribute('href') || '';
    const isActive = href === `#${state.route}`;
    a.style.fontWeight = isActive ? '700' : '';
  });
}

function renderHome() {
  const root = el('div', { class: 'dg-stack' });

  root.append(
    el('div', { class: 'dg-card' }, [
      el('div', { class: 'dg-card__body dg-prose' }, [
        el('h1', { class: 'dg-page-title', text: 'ホーム' }),
        el('p', { class: 'dg-lead', text: '短答入力×分散復習（FSRSベース）×混在出題。データはローカルに保存されます。' }),
        el('div', { class: 'dg-row' }, [
          el('a', { class: 'dg-btn', href: '#study', text: '今日の復習を始める' }),
          el('a', { class: 'dg-btn dg-btn--subtle', href: '#data', text: 'データを追加/バックアップ' }),
        ]),
      ]),
    ])
  );

  root.append(
    el('div', { class: 'dg-card' }, [
      el('div', { class: 'dg-card__body dg-prose' }, [
        el('h2', { text: 'クイック状況' }),
        el('div', { id: 'homeStats', class: 'dg-note' }, [
          el('span', { text: '読み込み中…' }),
        ]),
      ]),
    ])
  );

  // 非同期で埋める
  queueMicrotask(async () => {
    const box = root.querySelector('#homeStats');
    if (!box) return;

    const datasets = await state.db.listDatasets();
    const active = state.activeDatasetId;
    const meta = datasets.find(d => d.datasetId === active);
    const counts = active ? await state.db.countDue(active) : { overdue: 0, today: 0, total: 0 };

    box.replaceChildren(
      el('div', { class: 'dg-stack' }, [
        el('div', { class: 'dg-row' }, [
          el('span', { class: 'dg-badge', text: `データセット: ${meta ? meta.title : '未選択'}` }),
          el('span', { class: 'dg-badge', text: `総カード: ${counts.total}` }),
        ]),
        el('div', { class: 'dg-row' }, [
          el('span', { class: 'dg-badge', text: `期限切れ: ${counts.overdue}` }),
          el('span', { class: 'dg-badge', text: `今日: ${counts.today}` }),
        ]),
      ])
    );
  });

  return root;
}

function renderNotFound() {
  return el('div', { class: 'dg-card' }, [
    el('div', { class: 'dg-card__body dg-prose' }, [
      el('h1', { class: 'dg-page-title', text: 'Not Found' }),
      el('p', { text: 'ページが見つかりません。' }),
      el('a', { class: 'dg-btn', href: '#home', text: 'ホームへ' }),
    ]),
  ]);
}

async function renderStudy(app) {
  const card = el('div', { class: 'dg-card' }, [
    el('div', { class: 'dg-card__body dg-prose' }, [
      el('h1', { class: 'dg-page-title', text: '学習' }),
      el('p', { class: 'dg-lead', text: '短答入力で想起練習します。' }),
      el('div', { id: 'studyBody', class: 'dg-note' }, [el('span', { text: '準備中…' })] ),
    ]),
  ]);
  app.append(card);

  const body = card.querySelector('#studyBody');
  if (!body) return;

  const datasetId = state.activeDatasetId;
  if (!datasetId) {
    body.replaceChildren(
      el('div', { class: 'dg-stack' }, [
        el('p', { text: 'データセットがありません。まずはデータをインポートしてください。' }),
        el('a', { class: 'dg-btn', href: '#data', text: 'データ管理へ' }),
      ])
    );
    return;
  }

  const queue = await state.db.buildDueQueue(datasetId);
  if (!queue.length) {
    body.replaceChildren(
      el('div', { class: 'dg-stack' }, [
        el('p', { text: '今日の復習はありません（期限切れ/本日分なし）。' }),
        el('a', { class: 'dg-btn dg-btn--subtle', href: '#dashboard', text: 'ダッシュボードを見る' }),
      ])
    );
    return;
  }

  state.session = {
    datasetId,
    queue,
    current: null,
    lastTopic: null,
    startedAtMs: performance.now(),
  };

  nextCard(body);
}

function nextCard(container) {
  if (!state.session) return;
  const { queue } = state.session;
  const next = selectNextCard(queue, { lastTopic: state.session.lastTopic });
  state.session.current = next;
  state.session.lastTopic = next?.card?.topic || null;

  const startMs = performance.now();

  const input = el('input', {
    class: 'dg-input',
    type: 'text',
    inputmode: 'text',
    autocomplete: 'off',
    placeholder: '答えを入力',
  });

  const feedback = el('div', { class: 'dg-note', style: 'display:none;' });
  const actions = el('div', { class: 'dg-row' });

  const dialog = document.createElement('dialog');
  dialog.style.border = 'none';
  dialog.style.padding = '0';
  dialog.style.width = 'min(720px, calc(100% - 24px))';
  dialog.style.borderRadius = '12px';
  dialog.innerHTML = `
    <div class="dg-card" style="margin:0;">
      <div class="dg-card__body dg-prose">
        <div class="dg-row" style="justify-content: space-between; align-items: center;">
          <strong>解説</strong>
          <button class="dg-btn dg-btn--subtle" data-close>閉じる</button>
        </div>
        <div style="margin-top: var(--dg-space-4); white-space: pre-wrap;" data-body></div>
      </div>
    </div>
  `;
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());

  async function grade(correct, rating) {
    const responseMs = Math.max(0, Math.round(performance.now() - startMs));
    const reviewedAt = nowIso();

    await state.db.appendReview({
      datasetId: state.session.datasetId,
      cardId: next.card.id,
      reviewedAt,
      correct,
      rating,
      responseMs,
      answerRaw: input.value,
    });

    const priorState = await state.db.getCardState(state.session.datasetId, next.card.id);
    const settings = await state.db.getSettings();
    const updated = fsrsScheduleNext({
      now: new Date(reviewedAt),
      cardState: priorState,
      grade: rating,
      baseTargetR: settings.targetR ?? 0.85,
      examDateIso: settings.examDate ?? null,
    });

    await state.db.upsertCardState(state.session.datasetId, next.card.id, {
      ...updated,
      lastRating: rating,
      lastResponseMs: responseMs,
    });

    // 取り違え（誤答が別カードの答えに一致）
    if (!correct) {
      const confusion = await state.db.detectConfusion(state.session.datasetId, input.value, next.card.id);
      if (confusion) {
        await state.db.bumpConfusion(state.session.datasetId, next.card.id, confusion.cardId);

        // 直後に類似（取り違え先）を出して混同を潰す（interleaving補助）
        const exists = state.session.queue.some(x => x.card.id === confusion.cardId);
        if (!exists) {
          const c = await state.db.getCard(state.session.datasetId, confusion.cardId);
          if (c) {
            state.session.queue.unshift({
              card: {
                id: c.cardId,
                topic: c.topic,
                question: c.question,
                answers: c.answers,
                explanation: c.explanation || '',
              },
              dueAtMs: 0,
              priority: 1000000,
            });
          }
        }
      }
    }

    // キューから消す（採点が完了したら消す）
    const idx = state.session.queue.findIndex(x => x.card.id === next.card.id);
    if (idx >= 0) state.session.queue.splice(idx, 1);

    if (!state.session.queue.length) {
      container.replaceChildren(
        el('div', { class: 'dg-stack' }, [
          el('div', { class: 'dg-badge dg-badge--ok', text: '本日の学習が完了しました' }),
          el('a', { class: 'dg-btn', href: '#home', text: 'ホームへ戻る' }),
        ])
      );
      return;
    }

    nextCard(container);
  }

  function showBack(result) {
    feedback.style.display = '';
    feedback.classList.remove('dg-note--danger', 'dg-note--success');
    feedback.classList.add(result.correct ? 'dg-note--success' : 'dg-note--danger');

    const expected = result.expected;
    const actual = result.actual;
    const oneLine = result.correct
      ? '正解です。自己評価を選んで次へ。'
      : `正解: ${expected} / 入力: ${actual}`;

    feedback.replaceChildren(
      el('div', { class: 'dg-stack' }, [
        el('div', { class: result.correct ? 'dg-badge dg-badge--ok' : 'dg-badge dg-badge--ng', text: result.correct ? 'OK' : 'NG' }),
        el('div', { text: oneLine }),
      ])
    );

    input.disabled = true;
    actions.replaceChildren();

    if (result.correct) {
      actions.append(
        el('button', { class: 'dg-btn dg-btn--subtle', text: 'Hard', onclick: () => grade(true, 2) }),
        el('button', { class: 'dg-btn', text: 'Good', onclick: () => grade(true, 3) }),
        el('button', { class: 'dg-btn dg-btn--subtle', text: 'Easy', onclick: () => grade(true, 4) }),
      );
    } else {
      actions.append(
        el('button', { class: 'dg-btn', text: '次へ', onclick: () => grade(false, 1) })
      );
    }
  }

  const front = el('div', { class: 'dg-stack' }, [
    el('div', { class: 'dg-badge', text: next.card.topic ? `Topic: ${next.card.topic}` : 'Topic: -' }),
    el('h2', { text: next.card.question }),
    el('div', { class: 'dg-field' }, [
      el('label', { class: 'dg-label', for: 'answerInput', text: '回答' }),
      Object.assign(input, { id: 'answerInput' }),
      el('div', { class: 'dg-help', text: 'Enterで採点 / わからない場合は「わからない」' }),
    ]),
    el('div', { class: 'dg-row' }, [
      el('button', {
        class: 'dg-btn',
        text: '回答する',
        onclick: () => {
          const result = scoreAnswer(input.value, next.card.answers);
          showBack(result);
        },
      }),
      el('button', { class: 'dg-btn dg-btn--subtle', text: 'わからない', onclick: () => {
        showBack({ correct: false, expected: next.card.answers?.[0] ?? '', actual: input.value });
      } }),
      ...(next.card.explanation
        ? [el('button', {
            class: 'dg-btn dg-btn--subtle',
            text: '解説',
            onclick: () => {
              const body = dialog.querySelector('[data-body]');
              if (body) body.textContent = next.card.explanation;
              if (typeof dialog.showModal === 'function') dialog.showModal();
              else dialog.setAttribute('open', '');
            },
          })]
        : []),
    ]),
    feedback,
    actions,
    el('div', { class: 'dg-help', text: `残り: ${state.session.queue.length}` }),
    dialog,
  ]);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const result = scoreAnswer(input.value, next.card.answers);
      showBack(result);
    }
  });

  container.replaceChildren(front);
  input.focus();
}

async function renderDashboard(app) {
  const root = el('div', { class: 'dg-card' }, [
    el('div', { class: 'dg-card__body dg-prose' }, [
      el('h1', { class: 'dg-page-title', text: 'ダッシュボード' }),
      el('p', { class: 'dg-lead', text: '期限切れ、保持確率、取り違えの簡易表示（MVP）。' }),
      el('div', { id: 'dashBody', class: 'dg-note' }, [el('span', { text: '読み込み中…' })])
    ])
  ]);
  app.append(root);

  const box = root.querySelector('#dashBody');
  if (!box) return;

  const datasetId = state.activeDatasetId;
  if (!datasetId) {
    box.replaceChildren(el('span', { text: 'データセットがありません。' }));
    return;
  }

  const counts = await state.db.countDue(datasetId);
  const retr = await state.db.computeRetrievability(datasetId);
  const confusions = await state.db.listTopConfusions(datasetId, 10);

  box.replaceChildren(
    el('div', { class: 'dg-stack' }, [
      el('div', { class: 'dg-row' }, [
        el('span', { class: 'dg-badge', text: `期限切れ: ${counts.overdue}` }),
        el('span', { class: 'dg-badge', text: `今日: ${counts.today}` }),
        el('span', { class: 'dg-badge', text: `総カード: ${counts.total}` }),
      ]),
      el('div', { class: 'dg-row' }, [
        el('span', { class: 'dg-badge', text: `平均保持確率: ${Math.round(retr.avg * 100)}%` }),
      ]),
      el('h2', { text: '取り違えTop' }),
      confusions.length
        ? el('table', { class: 'dg-table' }, [
          el('thead', {}, [
            el('tr', {}, [
              el('th', { text: 'ペア' }),
              el('th', { text: '回数' }),
            ])
          ]),
          el('tbody', {}, confusions.map(c =>
            el('tr', {}, [
              el('td', { text: c.pairLabel }),
              el('td', { text: String(c.score) }),
            ])
          ))
        ])
        : el('p', { text: '取り違えはまだありません。' }),
    ])
  );
}

async function renderData(app) {
  const root = el('div', { class: 'dg-card' }, [
    el('div', { class: 'dg-card__body dg-prose' }, [
      el('h1', { class: 'dg-page-title', text: 'データ管理' }),
      el('p', { class: 'dg-lead', text: '教材データ（dataset.json）をインポートし、進捗をバックアップできます。' }),
    ])
  ]);
  app.append(root);

  const body = root.querySelector('.dg-card__body');
  if (!body) return;

  const datasetSelect = el('select', { class: 'dg-select', id: 'datasetSelect' });
  const refreshSelect = async () => {
    const datasets = await state.db.listDatasets();
    datasetSelect.replaceChildren();
    datasets.forEach(d => {
      const opt = el('option', { value: d.datasetId, text: d.title });
      if (d.datasetId === state.activeDatasetId) opt.selected = true;
      datasetSelect.append(opt);
    });
  };
  await refreshSelect();

  datasetSelect.addEventListener('change', async () => {
    state.activeDatasetId = datasetSelect.value || null;
    render();
  });

  const datasetFileInput = el('input', { type: 'file', class: 'dg-input', accept: 'application/json,.json' });
  const importDatasetBtn = el('button', { class: 'dg-btn', text: 'データセットをインポート' });

  const progressFileInput = el('input', { type: 'file', class: 'dg-input', accept: 'application/json,.json' });
  const mergeToggle = el('label', { class: 'dg-row' }, [
    el('input', { type: 'checkbox' }),
    el('span', { text: '既存データにマージ（通常はOFF）' }),
  ]);
  const importProgressBtn = el('button', { class: 'dg-btn', text: '進捗をインポート（復元）' });

  const exportBtn = el('button', { class: 'dg-btn dg-btn--subtle', text: '完全バックアップをエクスポート（1ファイル）' });
  const wipeBtn = el('button', { class: 'dg-btn dg-btn--danger', text: '全データ削除' });
  const msg = el('div', { class: 'dg-note', style: 'display:none;' });

  function showMsg(text, kind = 'info') {
    msg.style.display = '';
    msg.classList.remove('dg-note--danger', 'dg-note--success', 'dg-note--warning');
    if (kind === 'ok') msg.classList.add('dg-note--success');
    if (kind === 'ng') msg.classList.add('dg-note--danger');
    if (kind === 'warn') msg.classList.add('dg-note--warning');
    msg.textContent = text;
  }

  importDatasetBtn.addEventListener('click', async () => {
    const f = datasetFileInput.files?.[0];
    if (!f) return showMsg('JSONファイルを選択してください。', 'warn');

    try {
      const text = await f.text();
      const { datasetId, title } = await importDatasetJson(state.db, text);
      state.activeDatasetId = datasetId;
      await refreshSelect();
      showMsg(`インポート完了: ${title}`, 'ok');
    } catch (e) {
      showMsg(`インポート失敗: ${e?.message || e}`, 'ng');
    }
  });

  importProgressBtn.addEventListener('click', async () => {
    const f = progressFileInput.files?.[0];
    if (!f) return showMsg('進捗JSONファイルを選択してください。', 'warn');

    const merge = !!mergeToggle.querySelector('input')?.checked;
    if (!merge) {
      const ok = confirm('進捗を復元します。現在のデータは上書きされます。よろしいですか？');
      if (!ok) return;
    }

    try {
      const text = await f.text();
      await importProgressJson(state.db, text, { merge });

      const datasets = await state.db.listDatasets();
      if (datasets.length) state.activeDatasetId = datasets[0].datasetId;
      await refreshSelect();
      showMsg('進捗を復元しました。', 'ok');
      setTimeout(() => location.reload(), 500);
    } catch (e) {
      showMsg(`復元失敗: ${e?.message || e}`, 'ng');
    }
  });

  exportBtn.addEventListener('click', async () => {
    try {
      const json = await exportProgressJson(state.db);
      downloadText(`anki-progress-${new Date().toISOString().slice(0, 10)}.json`, json);
      showMsg('エクスポートしました。', 'ok');
    } catch (e) {
      showMsg(`エクスポート失敗: ${e?.message || e}`, 'ng');
    }
  });

  wipeBtn.addEventListener('click', async () => {
    if (!confirm('IndexedDBの全データを削除します。よろしいですか？')) return;
    await state.db.nuke();
    state.activeDatasetId = null;
    await refreshSelect();
    showMsg('削除しました。', 'ok');
  });

  body.append(
    el('hr'),
    el('h2', { text: 'アクティブデータセット' }),
    datasetSelect,
    el('h2', { text: '教材データ（JSON）インポート' }),
    el('div', { class: 'dg-note' }, [
      el('div', { class: 'dg-row' }, [
        el('span', { text: 'JSON形式の説明：' }),
        el('a', { href: './dataset-format.html', text: 'dataset.json 形式（memory-dataset/v1）' }),
      ]),
    ]),
    datasetFileInput,
    el('div', { class: 'dg-row' }, [importDatasetBtn]),
    el('h2', { text: '進捗の復元（バックアップJSON）' }),
    progressFileInput,
    mergeToggle,
    el('div', { class: 'dg-row' }, [importProgressBtn]),
    el('h2', { text: '完全バックアップ（教材＋進捗）' }),
    el('div', { class: 'dg-row' }, [exportBtn, wipeBtn]),
    msg
  );
}

async function renderSettings(app) {
  const root = el('div', { class: 'dg-card' }, [
    el('div', { class: 'dg-card__body dg-prose' }, [
      el('h1', { class: 'dg-page-title', text: '設定' }),
      el('p', { class: 'dg-lead', text: '目標保持率と試験日（MVP）' }),
      el('div', { id: 'settingsBody', class: 'dg-note' }, [el('span', { text: '読み込み中…' })])
    ])
  ]);
  app.append(root);

  const body = root.querySelector('#settingsBody');
  if (!body) return;

  const settings = await state.db.getSettings();
  const rInput = el('input', { class: 'dg-input', type: 'number', min: '0.7', max: '0.99', step: '0.01', value: String(settings.targetR ?? 0.85) });
  const examInput = el('input', { class: 'dg-input', type: 'date', value: settings.examDate ? settings.examDate.slice(0, 10) : '' });
  const saveBtn = el('button', { class: 'dg-btn', text: '保存' });

  saveBtn.addEventListener('click', async () => {
    const targetR = Number(rInput.value);
    const examDateIso = examInput.value ? parseDateInputToIso(examInput.value) : null;
    await state.db.setSettings({ targetR, examDate: examDateIso });
    body.replaceChildren(el('span', { text: `保存しました（${fmtDateTimeLocal(nowIso())}）` }));
    setTimeout(render, 400);
  });

  body.replaceChildren(
    el('div', { class: 'dg-stack' }, [
      el('div', { class: 'dg-field' }, [
        el('label', { class: 'dg-label', text: '通常時の目標保持率 r' }),
        rInput,
        el('div', { class: 'dg-help', text: '例: 0.85（試験日設定があれば直前ほど自動で引き上げ）' }),
      ]),
      el('div', { class: 'dg-field' }, [
        el('label', { class: 'dg-label', text: '試験日（任意）' }),
        examInput,
      ]),
      el('div', { class: 'dg-row' }, [saveBtn]),
    ])
  );
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

boot();
