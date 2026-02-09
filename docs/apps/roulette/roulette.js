// ====== 状態 ======
const STORAGE_KEY = "school_roulette_v1";

/** @type {number[]} 未抽選（右側に表示する「残り順番」） */
let remaining = [];
/** @type {number[]} 抽選済み（確定した順番） */
let done = [];

// ルーレット用
let rouletteTimer = null;
let rouletteCandidate = null;

// ====== 要素 ======
const elMin = document.getElementById("minNo");
const elMax = document.getElementById("maxNo");
const elAbsent = document.getElementById("absent");

const elChkRoulette = document.getElementById("chkRoulette");
const elChkHideSidebar = document.getElementById("chkHideSidebar");

const btnDraw = document.getElementById("btnDraw");
const btnNext = document.getElementById("btnNext");
const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");

const btnSave = document.getElementById("btnSave");
const btnLoad = document.getElementById("btnLoad");
const btnClear = document.getElementById("btnClear");

const elList = document.getElementById("list");
const elRemainCount = document.getElementById("remainCount");
const elDoneCount = document.getElementById("doneCount");

const elSidebar = document.getElementById("sidebar");
const elRing = document.getElementById("rouletteRing");
const elCurrent = document.getElementById("currentNo");
const elCurrentPlain = document.getElementById("currentNoPlain");

// ====== ユーティリティ ======
function clampInt(n, min, max) {
  n = Math.floor(Number(n));
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// 欠席入力 "3,5,10-12" -> Set<number>
function parseAbsent(str, minNo, maxNo) {
  const set = new Set();
  const s = (str || "").trim();
  if (!s) return set;

  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  for (const p of parts) {
    if (p.includes("-")) {
      const [a, b] = p.split("-").map((x) => x.trim());
      const start = clampInt(a, minNo, maxNo);
      const end = clampInt(b, minNo, maxNo);
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let i = lo; i <= hi; i++) set.add(i);
    } else {
      const v = clampInt(p, minNo, maxNo);
      set.add(v);
    }
  }
  return set;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateCounts() {
  elRemainCount.textContent = String(remaining.length);
  elDoneCount.textContent = String(done.length);
}

function setCurrentDisplay(value) {
  const txt = (value === null || value === undefined) ? "--" : String(value);
  elCurrent.textContent = txt;
  elCurrentPlain.textContent = txt;
}

// ====== リスト描画 & DnD ======
let dragIndex = null;

function renderList() {
  elList.innerHTML = "";
  remaining.forEach((num, idx) => {
    const item = document.createElement("div");
    item.className = "item";
    item.draggable = true;
    item.dataset.index = String(idx);

    const left = document.createElement("div");
    left.textContent = String(num);

    const right = document.createElement("div");
    right.className = "badge";
    right.textContent = `#${idx + 1}`;

    item.appendChild(left);
    item.appendChild(right);

    item.addEventListener("dragstart", (e) => {
      dragIndex = idx;
      e.dataTransfer.effectAllowed = "move";
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      item.classList.add("dragOver");
      e.dataTransfer.dropEffect = "move";
    });

    item.addEventListener("dragleave", () => item.classList.remove("dragOver"));

    item.addEventListener("drop", (e) => {
      e.preventDefault();
      item.classList.remove("dragOver");
      const dropIndex = Number(item.dataset.index);
      if (dragIndex === null || Number.isNaN(dropIndex) || dragIndex === dropIndex) return;

      const moved = remaining.splice(dragIndex, 1)[0];
      remaining.splice(dropIndex, 0, moved);

      dragIndex = null;
      renderList();
      updateCounts();
    });

    item.addEventListener("dragend", () => {
      dragIndex = null;
      item.classList.remove("dragOver");
    });

    elList.appendChild(item);
  });
}

// ====== 抽選（順番生成） ======
function buildRandomOrder() {
  const minNo = clampInt(elMin.value, 1, 9999);
  const maxNo = clampInt(elMax.value, 1, 9999);
  const lo = Math.min(minNo, maxNo);
  const hi = Math.max(minNo, maxNo);

  const absentSet = parseAbsent(elAbsent.value, lo, hi);

  const pool = [];
  for (let n = lo; n <= hi; n++) {
    if (!absentSet.has(n)) pool.push(n);
  }

  shuffle(pool);
  remaining = pool;
  done = [];
  rouletteCandidate = null;
  setCurrentDisplay(remaining[0] ?? "--");
  stopRoulette(true);
  renderList();
  updateCounts();
}

// ====== 順番モード：次へ ======
function nextInOrder() {
  if (remaining.length === 0) {
    setCurrentDisplay("--");
    return;
  }
  const n = remaining.shift();
  done.push(n);
  setCurrentDisplay(remaining[0] ?? "--");
  renderList();
  updateCounts();
}

function startRoulette() {
  if (remaining.length === 0) return;

  elRing.classList.remove("isStopped");
  btnStart.disabled = true;
  btnStop.disabled = false;
  rouletteCandidate = null;

  // 回転中は「残り配列」からランダム表示（確定はしない）
  rouletteTimer = setInterval(() => {
    if (remaining.length === 0) return;
    const i = Math.floor(Math.random() * remaining.length);
    rouletteCandidate = remaining[i];
    setCurrentDisplay(rouletteCandidate);
  }, 60);
}

function stopRoulette(silent = false) {
  if (rouletteTimer) {
    clearInterval(rouletteTimer);
    rouletteTimer = null;
  }
  elRing.classList.add("isStopped");
  btnStart.disabled = false;
  btnStop.disabled = true;

  if (silent) return;

  if (remaining.length === 0) {
    setCurrentDisplay("--");
    rouletteCandidate = null;
    return;
  }

  let picked = rouletteCandidate;
  if (picked == null) {
    picked = remaining[Math.floor(Math.random() * remaining.length)];
  }

  const idx = remaining.indexOf(picked);
  if (idx >= 0) remaining.splice(idx, 1);
  done.push(picked);

  setCurrentDisplay(picked);
  rouletteCandidate = null;

  renderList();
  updateCounts();
}

// ====== モード切替 ======
function applyMode() {
  const isRoulette = elChkRoulette.checked;

  if (isRoulette) {
    elRing.classList.remove("hidden");
    elCurrentPlain.classList.add("hidden");
    btnNext.classList.add("hidden");
    btnStart.classList.remove("hidden");
    btnStop.classList.remove("hidden");
  } else {
    elRing.classList.add("hidden");
    elCurrentPlain.classList.remove("hidden");
    btnNext.classList.remove("hidden");
    btnStart.classList.add("hidden");
    btnStop.classList.add("hidden");
    stopRoulette(true);
    setCurrentDisplay(remaining[0] ?? "--");
  }

  elSidebar.classList.toggle("hidden", elChkHideSidebar.checked);
}

// ====== 保存 / 読込 / 削除 ======
function saveState() {
  const payload = {
    version: 1,
    min: Number(elMin.value),
    max: Number(elMax.value),
    absent: String(elAbsent.value || ""),
    remaining,
    done,
    roulette: !!elChkRoulette.checked,
    hideSidebar: !!elChkHideSidebar.checked,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return;

    elMin.value = String(data.min ?? 1);
    elMax.value = String(data.max ?? 40);
    elAbsent.value = String(data.absent ?? "");

    remaining = Array.isArray(data.remaining) ? data.remaining.map(Number).filter(Number.isFinite) : [];
    done = Array.isArray(data.done) ? data.done.map(Number).filter(Number.isFinite) : [];

    elChkRoulette.checked = !!data.roulette;
    elChkHideSidebar.checked = !!data.hideSidebar;

    stopRoulette(true);
    renderList();
    updateCounts();
    setCurrentDisplay(remaining[0] ?? "--");
    applyMode();
  } catch (_) {
    // 何もしない
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  remaining = [];
  done = [];
  rouletteCandidate = null;
  stopRoulette(true);
  renderList();
  updateCounts();
  setCurrentDisplay("--");
}

// ====== イベント ======
btnDraw.addEventListener("click", () => {
  buildRandomOrder();
  applyMode();
});

btnNext.addEventListener("click", () => nextInOrder());

btnStart.addEventListener("click", () => startRoulette());
btnStop.addEventListener("click", () => stopRoulette(false));

btnSave.addEventListener("click", () => saveState());
btnLoad.addEventListener("click", () => loadState());
btnClear.addEventListener("click", () => clearState());

elChkRoulette.addEventListener("change", () => applyMode());
elChkHideSidebar.addEventListener("change", () => applyMode());

// ====== 初期化 ======
applyMode();
updateCounts();
setCurrentDisplay("--");
