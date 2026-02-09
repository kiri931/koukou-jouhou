// ui.js
(function () {
  // === 初期モード: 編集(VSCode風) ===
  const body = document.body;
  body.classList.add('mode-edit');

  // === プレビュー切替 ===
  const toggleBtn = document.getElementById('toggle-preview');
  let previewing = false;

  function setPreviewMode(on) {
    previewing = on;
    body.classList.toggle('mode-edit', !on);
    body.classList.toggle('mode-preview', on); // mode-preview は :root 既定（白黒）をそのまま使う
    if (toggleBtn) {
      toggleBtn.textContent = on ? '編集表示に戻す' : 'プレビュー表示';
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => setPreviewMode(!previewing));
  }

  // === 答え表示トグル ===
  const ansBtn = document.getElementById('show-answers');
  let showing = false;

  function updateAnswers(show) {
    document.querySelectorAll('.fill-blank').forEach(span => {
      if (show) {
        span.textContent = span.dataset.answer || span.textContent;
        span.classList.add('show');
      } else {
        // 空に戻す（元から文字がある設計なら必要に応じて保持ロジックを）
        if (span.dataset.answer) span.textContent = '';
        span.classList.remove('show');
      }
    });
  }

  if (ansBtn) {
    ansBtn.addEventListener('click', () => {
      showing = !showing;
      updateAnswers(showing);
      ansBtn.textContent = showing ? '答えを隠す' : '答えを表示';
    });
  }

  // === 印刷時は自動でプレビュー（白黒）へ、終了後に状態復元 ===
  let wasPreviewing = previewing;
  window.addEventListener('beforeprint', () => {
    wasPreviewing = previewing;
    setPreviewMode(true);
  });
  window.addEventListener('afterprint', () => {
    setPreviewMode(wasPreviewing);
  });

  // Safari等フォールバック
  const mq = window.matchMedia('print');
  if (mq.addEventListener) {
    mq.addEventListener('change', e => e.matches ? setPreviewMode(true) : setPreviewMode(wasPreviewing));
  } else if (mq.addListener) {
    mq.addListener(e => e.matches ? setPreviewMode(true) : setPreviewMode(wasPreviewing));
  }

  // 他スクリプトから呼べるように公開（print2統合向け）
  window.updateAnswers = updateAnswers;
  window.setPreviewMode = setPreviewMode;
})();

document.addEventListener("DOMContentLoaded", () => {
  const blanks = document.querySelectorAll(".fill-blank");

  blanks.forEach(blank => {
    const answer = blank.dataset.answer || "";
    const length = answer.length;

    // 1文字につき2emの幅、最低でも4em確保
    const width = Math.max(length , 4) + "em";

    blank.style.width = width;
  });
});
