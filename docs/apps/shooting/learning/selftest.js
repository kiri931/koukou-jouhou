const STORAGE_PREFIX = "shooting:learning:playground:v1";

const logEl = document.getElementById("log");
const frame = document.getElementById("pgFrame");
const progressBarEl = document.getElementById("progressBar");
const progressPercentEl = document.getElementById("progressPercent");
const progressLabelEl = document.getElementById("progressLabel");

function setProgress(pct, label) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  if (progressBarEl) progressBarEl.style.width = `${p}%`;
  if (progressPercentEl) progressPercentEl.textContent = `${Math.round(p)}%`;
  if (progressLabelEl && typeof label === "string") progressLabelEl.textContent = label;
}

function log(line) {
  if (!logEl) return;
  logEl.textContent += `${line}\n`;
}

function section(title) {
  log(`\n== ${title} ==`);
}

function assert(cond, message) {
  if (!cond) {
    throw new Error(message || "assert failed");
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout(promise, timeoutMs, label) {
  let t = null;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`timeout: ${label}`)), timeoutMs);
  });
  return Promise.race([
    promise.finally(() => {
      if (t) clearTimeout(t);
    }),
    timeout,
  ]);
}

async function waitFor(fn, { timeoutMs = 8000, intervalMs = 50, label = "condition" } = {}) {
  const start = Date.now();
  while (true) {
    try {
      const v = fn();
      if (v) return v;
    } catch {
      // ignore until timeout
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timeout: ${label}`);
    }
    await sleep(intervalMs);
  }
}

function clearPlaygroundSavedItems() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith(`${STORAGE_PREFIX}:`)) keys.push(k);
  }
  for (const k of keys) localStorage.removeItem(k);
  return keys.length;
}

function getSavedStep(step) {
  const raw = localStorage.getItem(`${STORAGE_PREFIX}:${step}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getCodeMirrorInstance(win, textareaId) {
  const doc = win.document;
  const wrappers = Array.from(doc.querySelectorAll(".CodeMirror"));
  for (const el of wrappers) {
    const cm = el && el.CodeMirror;
    if (!cm || typeof cm.getTextArea !== "function") continue;
    const ta = cm.getTextArea();
    if (ta && ta.id === textareaId) return cm;
  }
  return null;
}

function setEditorValue(win, textareaId, value) {
  const cm = getCodeMirrorInstance(win, textareaId);
  if (cm) {
    cm.setValue(String(value ?? ""));
    return;
  }
  const ta = win.document.getElementById(textareaId);
  assert(ta, `textarea not found: ${textareaId}`);
  ta.value = String(value ?? "");
  ta.dispatchEvent(new win.Event("input", { bubbles: true }));
}

async function loadPlayground(step) {
  assert(frame, "iframe not found");

  const url = `./playground.html?step=${encodeURIComponent(step)}`;

  const loadPromise = new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("iframe load error"));
    };
    const cleanup = () => {
      frame.removeEventListener("load", onLoad);
      frame.removeEventListener("error", onError);
    };
    frame.addEventListener("load", onLoad);
    frame.addEventListener("error", onError);
    frame.src = url;
  });

  await withTimeout(loadPromise, 12000, "iframe load");

  const win = frame.contentWindow;
  const doc = win.document;

  // Playground は初回自動実行で status が「実行しました。」に上書きされるため、
  // status 文言ではなく、必要なDOMが揃った時点を「準備完了」とみなす。
  await waitFor(
    () => {
      const hasEditors = !!doc.getElementById("jsText") && !!doc.getElementById("cssText") && !!doc.getElementById("htmlText");
      const hasButtons = !!doc.getElementById("runBtn") && !!doc.getElementById("exportBtn") && !!doc.getElementById("importFile");
      return hasEditors && hasButtons;
    },
    { timeoutMs: 15000, label: "playground dom ready" }
  );

  // 明示的な失敗メッセージだけは拾って落とす
  const status = doc.getElementById("status");
  const statusText = status ? String(status.textContent || "").trim() : "";
  if (statusText.includes("読み込みに失敗")) {
    throw new Error(`playground failed: ${statusText}`);
  }

  return { win, doc };
}

async function testLocalStorageSave() {
  section("localStorage JSON保存");
  setProgress(10, "1/3 localStorage保存を確認中");
  const step = "step2";
  const { win } = await loadPlayground(step);

  setProgress(20, "1/3 JSを書き込み中");

  const js = `// selftest\nconst canvas = document.getElementById("gameCanvas");\nconst ctx = canvas.getContext("2d");\nctx.fillStyle = "red";\nctx.fillRect(10, 10, 20, 20);\n`;
  setEditorValue(win, "jsText", js);

  // debounce保存は環境によって遅延する（iframe/非アクティブ時のタイマー抑制など）ので、
  // 固定sleepではなく「保存されるまで待つ」にする。
  setProgress(30, "1/3 保存内容を検証中");
  const saved = await waitFor(
    () => {
      const s = getSavedStep(step);
      if (!s) return null;
      if (typeof s.js !== "string") return null;
      if (!s.js.includes("selftest")) return null;
      if (typeof s.updatedAt !== "number") return null;
      return s;
    },
    { timeoutMs: 8000, label: "localStorage save" }
  );
  assert(saved, "保存データが見つかりません");

  log("OK: localStorageにJSONとして保存されました");
  setProgress(33, "1/3 完了");
}

async function testExportJson() {
  section("Export JSONの中身");
  setProgress(40, "2/3 Export JSONを確認中");
  const { win, doc } = await loadPlayground("step2");

  let capturedBlob = null;
  let clickCalled = false;

  const origCreateObjectURL = win.URL.createObjectURL.bind(win.URL);
  const origAPrototypeClick = win.HTMLAnchorElement.prototype.click;

  try {
    win.URL.createObjectURL = (blob) => {
      capturedBlob = blob;
      return origCreateObjectURL(blob);
    };
    win.HTMLAnchorElement.prototype.click = function () {
      // block navigation/download; just record
      clickCalled = true;
    };

    const btn = doc.getElementById("exportBtn");
    assert(btn, "exportBtnが見つかりません");
    btn.click();

    await waitFor(() => capturedBlob && clickCalled, { label: "export capture" });

    const text = await capturedBlob.text();
    const data = JSON.parse(text);
    assert(data && typeof data === "object", "export JSONがobjectではありません");
    assert(data.version === 1, "export versionが想定と違います");
    assert(data.items && typeof data.items === "object", "export itemsがありません");

    const item = data.items.step2;
    assert(item && typeof item === "object", "items.step2がありません");
    assert(typeof item.js === "string" && item.js.length > 0, "items.step2.jsが空です");

    log("OK: ExportされたJSONの形式を確認しました");
    setProgress(66, "2/3 完了");
  } finally {
    win.URL.createObjectURL = origCreateObjectURL;
    win.HTMLAnchorElement.prototype.click = origAPrototypeClick;
  }
}

async function testImportJson() {
  section("Import JSONで復元");
  setProgress(75, "3/3 Import JSONを確認中");
  const { win, doc } = await loadPlayground("step2");

  // clear existing playground items (only our prefix)
  const cleared = clearPlaygroundSavedItems();
  log(`事前削除: ${cleared}件`);

  const payload = {
    version: 1,
    exportedAt: Date.now(),
    items: {
      step2: { html: "", css: "", js: "// imported\nconsole.log('imported');\n", updatedAt: Date.now() },
      step3: { html: "", css: "", js: "// imported-step3\n", updatedAt: Date.now() },
    },
  };

  const file = new win.File([JSON.stringify(payload, null, 2)], "selftest-import.json", {
    type: "application/json",
  });

  const input = doc.getElementById("importFile");
  assert(input, "importFileが見つかりません");

  // set input.files via DataTransfer
  let dt;
  try {
    dt = new win.DataTransfer();
  } catch {
    dt = null;
  }
  assert(dt, "このブラウザではDataTransferが使えず、importの自動テストができません");

  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new win.Event("change", { bubbles: true }));

  await waitFor(
    () => {
      const status = doc.getElementById("status");
      const t = status ? String(status.textContent || "") : "";
      return t.includes("インポートしました");
    },
    { label: "import done" }
  );

  const saved2 = getSavedStep("step2");
  const saved3 = getSavedStep("step3");
  assert(saved2 && String(saved2.js || "").includes("imported"), "step2がimportされていません");
  assert(saved3 && String(saved3.js || "").includes("imported-step3"), "step3がimportされていません");

  log("OK: ImportでlocalStorageに復元されました");
  setProgress(100, "3/3 完了");
}

async function runAll() {
  if (logEl) logEl.textContent = "";
  setProgress(0, "開始");
  log(`Start: ${new Date().toLocaleString()}`);

  try {
    await testLocalStorageSave();
    await testExportJson();
    await testImportJson();

    log("\nALL PASS");
  } catch (e) {
    log("\nFAIL");
    log(String(e && e.stack ? e.stack : e));
  }
}

document.getElementById("runTestsBtn")?.addEventListener("click", runAll);
document.getElementById("clearBtn")?.addEventListener("click", () => {
  const n = clearPlaygroundSavedItems();
  if (logEl) logEl.textContent = "";
  log(`削除しました: ${n}件`);
});
