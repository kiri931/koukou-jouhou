// form-gas-generator.js
// Googleフォーム（GAS）生成ツールのロジック

(() => {
  const STORAGE_KEY_THEME = 'presentation.theme';

  function getTheme() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }

  window.addEventListener('DOMContentLoaded', () => {
    applyTheme(getTheme());
    document.getElementById('btnTheme')?.addEventListener('click', () => {
      const next = (document.documentElement.dataset.theme === 'dark') ? 'light' : 'dark';
      applyTheme(next);
    });

    // ==============================
    //  テンプレ定義
    // ==============================
    const YES_NO = ["はい", "いいえ"];

    function baseTemplate(mode) {
      const common = {
        mode,
        title: "",
        description: "",
        linkSheetName: "FormLinks",
        confirmationMessage: "提出ありがとうございました。",
        forceLogin: true, // default
        useSample: (mode === "peer"),
        items: {
          basic: [],
          sample: [],
          rating: [],
          free: []
        }
      };

      if (mode === "peer") {
        common.title = "生徒：相互評価フォーム（My Favorite）";
        common.description =
          "相互評価フォームです。\n" +
          "・評価される人（相手）を間違えないように入力してください。\n" +
          "・必要ならコメントも具体的に書きましょう。";
        common.items.basic = [
          mkText("selfNo", "自分の出席番号", true, true, "例）12"),
          mkText("selfName", "自分の名前", true, true, "例）安達 智宏"),
          mkText("targetNo", "評価される人の出席番号", true, true, "例）8"),
          mkText("targetName", "評価される人の名前", true, true, "例）山田 太郎"),
        ];
        common.items.sample = [
          mkMC("s_readable", "後ろから読めた（文字が大きい）", YES_NO, true, true),
          mkMC("s_oneMessage", "1スライド1メッセージだった", YES_NO, true, true),
          mkMC("s_conclusionFirst", "結論が最初に言えていた", YES_NO, true, true),
          mkMC("s_voice", "声・速さが聞き取りやすかった", YES_NO, true, true),
          mkMC("s_inTime", "時間内に終わった", YES_NO, true, true),
          mkPara("s_comment", "（サンプル）コメント（任意）", true, false, "具体的に：良かった点／改善点など"),
        ];
        common.items.rating = defaultRatings(3);
        common.items.free = [
          mkPara("goodPoint", "良かった点", true, true, "例）図が分かりやすい／声が聞き取りやすい 等"),
          mkPara("badPoint", "悪かった点（改善点）", true, true, "例）結論が遅い／文字が小さい 等"),
          mkPara("comment", "コメント（任意）", true, false, "自由記述"),
        ];
        return common;
      }

      if (mode === "self") {
        common.title = "生徒：自己評価フォーム（My Favorite）";
        common.description =
          "自己評価フォームです。\n" +
          "・発表後に正直に振り返りましょう。\n" +
          "・改善点を次に活かすのが目的です。";
        common.useSample = false;
        common.items.basic = [
          mkText("selfNo", "自分の出席番号", true, true, "例）12"),
          mkText("selfName", "自分の名前", true, true, "例）安達 智宏"),
        ];
        common.items.sample = [];
        common.items.rating = defaultRatings(3);
        common.items.free = [
          mkPara("goodPoint", "良かった点", true, true, "例）結論を最初に言えた／テンポが良かった 等"),
          mkPara("badPoint", "悪かった点（改善点）", true, true, "例）声が小さかった／時間がオーバーした 等"),
          mkPara("comment", "コメント（任意）", true, false, "自由記述"),
        ];
        return common;
      }

      // teacher
      common.title = "先生：評価フォーム（My Favorite）";
      common.description =
        "先生用の評価フォームです。\n" +
        "・必要に応じて評価項目名や点数範囲を調整してください。";
      common.useSample = false;
      common.items.basic = [
        mkText("targetNo", "評価される人の出席番号", true, true, "例）8"),
        mkText("targetName", "評価される人の名前", true, true, "例）山田 太郎"),
      ];
      common.items.sample = [];
      common.items.rating = defaultRatings(3);
      common.items.free = [
        mkPara("goodPoint", "良かった点", true, true, "例）根拠の示し方が上手い／聞き手を見ていた 等"),
        mkPara("badPoint", "悪かった点（改善点）", true, true, "例）情報量が多い／操作がぎこちない 等"),
        mkPara("comment", "コメント（任意）", true, false, "自由記述"),
      ];
      return common;
    }

    function mkText(id, title, include, required, help = "") {
      return { id, kind: "text", title, include, required, help, choices: [], lower: null, upper: null, leftLabel: "", rightLabel: "" };
    }
    function mkPara(id, title, include, required, help = "") {
      return { id, kind: "paragraph", title, include, required, help, choices: [], lower: null, upper: null, leftLabel: "", rightLabel: "" };
    }
    function mkMC(id, title, choices, include, required, help = "") {
      return { id, kind: "multiple", title, include, required, help, choices: [...choices], lower: null, upper: null, leftLabel: "", rightLabel: "" };
    }
    function mkScale(id, title, include, required, lower, upper, leftLabel = "", rightLabel = "", help = "") {
      return { id, kind: "scale", title, include, required, help, choices: [], lower, upper, leftLabel, rightLabel };
    }
    function defaultRatings(n) {
      const out = [];
      for (let i = 1; i <= n; i++) {
        out.push(mkScale(`rating${i}`, `評価項目${i}`, true, true, 1, 4, "低い", "高い", "点数で評価してください"));
      }
      return out;
    }

    // ==============================
    //  状態と描画
    // ==============================
    const MODES = [
      { key: "peer", title: "生徒評価（相互評価）", desc: "自分以外の生徒を評価するフォーム" },
      { key: "self", title: "自己評価", desc: "自分の発表を振り返るフォーム" },
      { key: "teacher", title: "先生用評価", desc: "先生が生徒を評価するフォーム" }
    ];

    let state = baseTemplate("peer");
    let defaultState = deepClone(state);

    const $ = (id) => document.getElementById(id);

    function deepClone(obj) {
      return JSON.parse(JSON.stringify(obj));
    }

    function toast(msg) {
      const t = $("toast");
      if (!t) return;
      t.textContent = msg;
      t.style.display = "block";
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => t.style.display = "none", 1600);
    }

    function renderModeBox() {
      const box = $("modeBox");
      if (!box) return;
      box.innerHTML = MODES.map(m => `
        <button class="pr-modeBtn" type="button" data-mode="${m.key}" aria-pressed="${state.mode === m.key}">
          <div class="pr-modeBtn__title">${m.title}</div>
          <div class="pr-modeBtn__desc">${m.desc}</div>
        </button>
      `).join("");

      box.querySelectorAll(".pr-modeBtn").forEach(el => {
        el.addEventListener("click", () => {
          const mode = el.getAttribute("data-mode");
          state = baseTemplate(mode);
          defaultState = deepClone(state);
          renderAll();
          toast("テンプレを読み込みました");
        });
      });
    }

    function renderAll() {
      renderModeBox();

      $("formTitle").value = state.title || "";
      $("formDesc").value = state.description || "";
      $("linkSheetName").value = state.linkSheetName || "FormLinks";
      $("confirmMsg").value = state.confirmationMessage || "提出ありがとうございました。";
      $("forceLogin").checked = !!state.forceLogin;

      const sampleSection = $("sampleSection");
      if (state.mode === "peer") {
        sampleSection.style.display = "";
        $("useSample").checked = !!state.useSample;
      } else {
        sampleSection.style.display = "none";
      }

      renderItems("basicItems", state.items.basic);
      renderItems("sampleItems", state.items.sample, { hideIfDisabled: true, gateId: "useSample" });
      renderItems("ratingItems", state.items.rating);
      renderItems("freeItems", state.items.free);
    }

    function kindLabel(kind) {
      switch (kind) {
        case "text": return "テキスト(1行)";
        case "paragraph": return "段落(複数行)";
        case "multiple": return "選択(ラジオ)";
        case "list": return "選択(プルダウン)";
        case "scale": return "点数(スケール)";
        default: return kind;
      }
    }

    function renderItems(containerId, items, opt = {}) {
      const box = $(containerId);
      if (!box) return;
      const gate = opt.gateId ? $(opt.gateId) : null;
      const gateEnabled = gate ? !!gate.checked : true;

      box.innerHTML = items.map((it) => {
        const disabled = opt.hideIfDisabled && !gateEnabled ? "disabled" : "";
        const dimStyle = opt.hideIfDisabled && !gateEnabled ? "opacity:.55;" : "";
        const includeChecked = it.include ? "checked" : "";
        const reqChecked = it.required ? "checked" : "";

        const choicesValue = (it.choices && it.choices.length) ? it.choices.join(",") : "";

        const scaleControls = (it.kind === "scale") ? `
          <div class="pr-itemGrid2">
            <div class="dg-field">
              <label class="dg-label">下限（0 or 1）</label>
              <input ${disabled} class="dg-input" data-k="lower" data-id="${it.id}" type="number" min="0" max="1" step="1" value="${(it.lower ?? 1)}" />
            </div>
            <div class="dg-field">
              <label class="dg-label">上限（3〜10）</label>
              <input ${disabled} class="dg-input" data-k="upper" data-id="${it.id}" type="number" min="3" max="10" step="1" value="${(it.upper ?? 4)}" />
            </div>
          </div>
          <div class="pr-itemGrid2">
            <div class="dg-field">
              <label class="dg-label">下限ラベル（任意）</label>
              <input ${disabled} class="dg-input" data-k="leftLabel" data-id="${it.id}" type="text" value="${escapeHtml(it.leftLabel || "")}" />
            </div>
            <div class="dg-field">
              <label class="dg-label">上限ラベル（任意）</label>
              <input ${disabled} class="dg-input" data-k="rightLabel" data-id="${it.id}" type="text" value="${escapeHtml(it.rightLabel || "")}" />
            </div>
          </div>
        ` : "";

        const choiceControls = (it.kind === "multiple" || it.kind === "list") ? `
          <div class="dg-field" style="margin-top: var(--dg-space-3);">
            <label class="dg-label">選択肢（カンマ区切り）</label>
            <input ${disabled} class="dg-input" data-k="choices" data-id="${it.id}" type="text" value="${escapeHtml(choicesValue)}" />
          </div>
        ` : "";

        return `
          <div class="pr-item" style="${dimStyle}">
            <div class="pr-itemTop">
              <div class="pr-itemToggles">
                <label class="pr-toggle"><input ${disabled} data-k="include" data-id="${it.id}" type="checkbox" ${includeChecked} /> 使う</label>
                <label class="pr-toggle"><input ${disabled} data-k="required" data-id="${it.id}" type="checkbox" ${reqChecked} /> 必須</label>
              </div>
              <div class="dg-field" style="min-width: 240px; flex: 1;">
                <label class="dg-label">質問文（タイトル）</label>
                <input ${disabled} class="dg-input" data-k="title" data-id="${it.id}" type="text" value="${escapeHtml(it.title)}" />
              </div>
              <div class="dg-badge">${kindLabel(it.kind)}</div>
            </div>

            ${scaleControls}
            ${choiceControls}

            <div class="dg-field" style="margin-top: var(--dg-space-3);">
              <label class="dg-label">説明（任意 / HelpText）</label>
              <input ${disabled} class="dg-input" data-k="help" data-id="${it.id}" type="text" value="${escapeHtml(it.help || "")}" />
            </div>
          </div>
        `;
      }).join("");

      box.querySelectorAll("[data-id]").forEach(inp => {
        inp.addEventListener("input", onItemChanged);
        inp.addEventListener("change", onItemChanged);
      });
    }

    function escapeHtml(s) {
      return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    }

    function findItemById(id) {
      for (const section of ["basic", "sample", "rating", "free"]) {
        const arr = state.items[section];
        const found = arr.find(x => x.id === id);
        if (found) return found;
      }
      return null;
    }

    function onItemChanged(ev) {
      const el = ev.target;
      const id = el.getAttribute("data-id");
      const k = el.getAttribute("data-k");
      const item = findItemById(id);
      if (!item) return;

      if (k === "include" || k === "required") {
        item[k] = !!el.checked;
        return;
      }

      if (k === "choices") {
        const raw = el.value || "";
        const arr = raw.split(",").map(x => x.trim()).filter(Boolean);
        item.choices = arr;
        return;
      }

      if (k === "lower" || k === "upper") {
        item[k] = parseInt(el.value, 10);
        return;
      }

      item[k] = el.value;
    }

    // ==============================
    //  イベント
    // ==============================
    $("useSample").addEventListener("change", () => {
      state.useSample = !!$("useSample").checked;
      renderItems("sampleItems", state.items.sample, { hideIfDisabled: true, gateId: "useSample" });
    });

    $("btnAddRating").addEventListener("click", () => {
      const n = state.items.rating.length + 1;
      state.items.rating.push(mkScale(`rating${n}`, `評価項目${n}`, true, true, 1, 4, "低い", "高い", "点数で評価してください"));
      renderItems("ratingItems", state.items.rating);
      toast("評価項目を追加しました");
    });

    $("btnRemoveRating").addEventListener("click", () => {
      if (state.items.rating.length <= 1) {
        toast("これ以上減らせません");
        return;
      }
      state.items.rating.pop();
      renderItems("ratingItems", state.items.rating);
      toast("評価項目を削除しました");
    });

    $("btnReset").addEventListener("click", () => {
      state = deepClone(defaultState);
      renderAll();
      toast("テンプレに戻しました");
    });

    $("btnGenerate").addEventListener("click", () => {
      syncFormSettings();
      const code = generateGasCode(exportConfig());
      $("codeOut").value = code;
      toast("GASコードを生成しました");
    });

    $("btnCopy").addEventListener("click", async () => {
      const text = $("codeOut").value || "";
      if (!text.trim()) {
        toast("先にコードを生成してください");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        toast("コピーしました");
      } catch (e) {
        $("codeOut").focus();
        $("codeOut").select();
        document.execCommand("copy");
        toast("コピーしました（互換モード）");
      }
    });

    function syncFormSettings() {
      state.title = $("formTitle").value || "";
      state.description = $("formDesc").value || "";
      state.linkSheetName = $("linkSheetName").value || "FormLinks";
      state.confirmationMessage = $("confirmMsg").value || "提出ありがとうございました。";
      state.forceLogin = !!$("forceLogin").checked;

      if (state.mode === "peer") {
        state.useSample = !!$("useSample").checked;
      } else {
        state.useSample = false;
      }
    }

    function exportConfig() {
      const cfg = deepClone(state);
      if (cfg.mode === "peer" && !cfg.useSample) {
        cfg.items.sample.forEach(it => it.include = false);
      }
      return cfg;
    }

    // ==============================
    //  GASコード生成
    // ==============================
    function generateGasCode(cfg) {
      for (const it of cfg.items.rating) {
        if (it.kind === "scale") {
          it.lower = normalizeLower(it.lower);
          it.upper = normalizeUpper(it.upper);
        }
      }

      const configLiteral = JSON.stringify(cfg, null, 2);

      return `/**
 * Googleフォーム（評価用）を、スプレッドシートから自動生成するGAS
 *
 * 使い方：
 * 1) このコードをスプレッドシートの Apps Script（Code.gs）に貼る
 * 2) 関数 createEvaluationForm を実行（初回は権限許可）
 * 3) スプレッドシートに ${cfg.linkSheetName} シートが作られ、publishedUrl が提出用リンク
 */

// ====== 生成時の設定（ここは自動生成） ======
const CONFIG = ${configLiteral};

function createEvaluationForm() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const linkSheetName = CONFIG.linkSheetName || "FormLinks";

  // フォーム作成（未公開で作ってから公開）
  // FormApp.create(title, isPublished=false) 形式が使える環境では安全です
  let form;
  try {
    form = FormApp.create(CONFIG.title || "評価フォーム", false);
  } catch (e) {
    form = FormApp.create(CONFIG.title || "評価フォーム");
  }

  if (CONFIG.description) form.setDescription(CONFIG.description);
  if (CONFIG.confirmationMessage) form.setConfirmationMessage(CONFIG.confirmationMessage);

  // 回答の保存先をこのスプレッドシートに設定
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Googleログインを強制（環境差があるので try/catch）
  if (CONFIG.forceLogin) {
    // ログインメールを取得したい運用なら collectEmail をONにするのが基本
    try { form.setCollectEmail(true); } catch (e) {}

    // setRequireLogin は環境により失敗する場合があるため安全に
    try { form.setRequireLogin(true); } catch (e) {}
  }

  // ====== 項目追加 ======
  addItemsFromSection_(form, CONFIG.items.basic);
  addItemsFromSection_(form, CONFIG.items.sample);
  addItemsFromSection_(form, CONFIG.items.rating);
  addItemsFromSection_(form, CONFIG.items.free);

  // 公開
  try { form.setPublished(true); } catch (e) {}

  // URL書き出し
  const sh = ss.getSheetByName(linkSheetName) || ss.insertSheet(linkSheetName);
  sh.clear();
  sh.getRange(1,1,1,4).setValues([["createdAt","mode","publishedUrl","editUrl"]]);
  sh.getRange(2,1,1,4).setValues([[new Date(), CONFIG.mode || "", form.getPublishedUrl(), form.getEditUrl()]]);
  sh.setFrozenRows(1);

  Logger.log("提出用URL: " + form.getPublishedUrl());
  Logger.log("編集URL: " + form.getEditUrl());
}

function addItemsFromSection_(form, items) {
  if (!items || !items.length) return;
  items.forEach(item => {
    if (!item || item.include === false) return;
    addOneItem_(form, item);
  });
}

function addOneItem_(form, item) {
  const kind = item.kind;
  const title = item.title || "";
  const help  = item.help || "";
  const required = !!item.required;

  if (kind === "text") {
    const it = form.addTextItem().setTitle(title);
    if (help) it.setHelpText(help);
    it.setRequired(required);
    return;
  }

  if (kind === "paragraph") {
    const it = form.addParagraphTextItem().setTitle(title);
    if (help) it.setHelpText(help);
    it.setRequired(required);
    return;
  }

  if (kind === "multiple") {
    const it = form.addMultipleChoiceItem().setTitle(title);
    if (help) it.setHelpText(help);
    const choices = (item.choices && item.choices.length) ? item.choices : ["はい","いいえ"];
    it.setChoiceValues(choices);
    it.setRequired(required);
    return;
  }

  if (kind === "list") {
    const it = form.addListItem().setTitle(title);
    if (help) it.setHelpText(help);
    const choices = (item.choices && item.choices.length) ? item.choices : ["選択肢1"];
    it.setChoiceValues(choices);
    it.setRequired(required);
    return;
  }

  if (kind === "scale") {
    const it = form.addScaleItem().setTitle(title);
    if (help) it.setHelpText(help);

    const lower = clampLower_(item.lower);
    const upper = clampUpper_(item.upper);
    it.setBounds(lower, upper);

    const leftLabel = item.leftLabel || "";
    const rightLabel = item.rightLabel || "";
    if (leftLabel || rightLabel) it.setLabels(leftLabel, rightLabel);

    it.setRequired(required);
    return;
  }
}

function clampLower_(n) {
  const v = parseInt(n, 10);
  return (v === 0) ? 0 : 1; // lower must be 0 or 1
}

function clampUpper_(n) {
  let v = parseInt(n, 10);
  if (isNaN(v)) v = 5;
  if (v < 3) v = 3;
  if (v > 10) v = 10;
  return v;
}
`;
    }

    function normalizeLower(v) {
      const n = parseInt(v, 10);
      return (n === 0) ? 0 : 1;
    }
    function normalizeUpper(v) {
      let n = parseInt(v, 10);
      if (isNaN(n)) n = 4;
      if (n < 3) n = 3;
      if (n > 10) n = 10;
      return n;
    }

    // ==============================
    //  初期化
    // ==============================
    renderAll();
    $("btnGenerate").click();
  });
})();
