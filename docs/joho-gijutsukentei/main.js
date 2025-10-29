// main.js
(function(){
  const viewport = document.querySelector('.car-viewport');
  const track = document.querySelector('.car-track');
  const slides = Array.from(document.querySelectorAll('.car-slide'));
  const btnPrev = document.querySelector('.car-btn.prev');
  const btnNext = document.querySelector('.car-btn.next');
  const btnView = document.getElementById('btn-view-photos');

  if (!viewport || !track || slides.length === 0) return;

  // id -> index マップ（テーブルの data-target からスライド特定）
  const idToIndex = Object.fromEntries(slides.map((s,i)=>[s.dataset.id,i]));
  let index = 0;
  let timer = null;
  const AUTO_MS = 4000;

  const clampIndex = (i)=> (i + slides.length) % slides.length;

// 中央寄せで目的スライドへ移動（端でも中央に来るようにガターを自動調整）
const goTo = (i, { highlight = false } = {}) => {
  index = clampIndex(i);
  const target = slides[index];

  // 1) エッジ用の左右ガターを、現在のスライド幅に合わせて自動設定
  const gutter = Math.max(0, (viewport.clientWidth - target.clientWidth) / 2);
  track.style.paddingLeft  = `${gutter}px`;
  track.style.paddingRight = `${gutter}px`;

  // 2) 目的スライドの中心を表示域の中心に合わせるスクロール量を計算
  //    （paddingやborderの影響も吸収するためRect差分＋scrollLeftで算出）
  const slideRect = target.getBoundingClientRect();
  const vpRect    = viewport.getBoundingClientRect();
  const offset    = (slideRect.left - vpRect.left) + viewport.scrollLeft; // 先頭までの距離
  const desired   = offset - (viewport.clientWidth - target.clientWidth) / 2;

  // 3) スクロール範囲にクランプしてスクロール
  const max = viewport.scrollWidth - viewport.clientWidth;
  const left = Math.max(0, Math.min(desired, max));
  viewport.scrollTo({ left, behavior: "smooth" });

  // 4) （お好み機能）ハイライト
  if (highlight) {
    target.classList.add("highlight");
    setTimeout(() => target.classList.remove("highlight"), 2400);
  }
};


  const next = ()=> goTo(index+1);
  const prev = ()=> goTo(index-1);

  // 現在位置をスクロールから推定して index を更新（手動スワイプ対応）
  const updateIndexFromScroll = ()=>{
    const center = viewport.scrollLeft + viewport.clientWidth/2;
    let nearest = 0;
    let best = Infinity;
    slides.forEach((s,i)=>{
      const sCenter = s.offsetLeft + s.offsetWidth/2;
      const d = Math.abs(sCenter - center);
      if (d < best){ best = d; nearest = i; }
    });
    index = nearest;
  };

  // 自動再生（hover/フォーカスで一時停止）
  const startAuto = ()=>{
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (timer) return;
    timer = setInterval(next, AUTO_MS);
  };
  const stopAuto = ()=>{
    if (timer){ clearInterval(timer); timer = null; }
  };

  viewport.addEventListener('mouseenter', stopAuto);
  viewport.addEventListener('mouseleave', startAuto);
  viewport.addEventListener('focusin', stopAuto);
  viewport.addEventListener('focusout', startAuto);
  viewport.addEventListener('scroll', ()=> { requestAnimationFrame(updateIndexFromScroll); });

  btnNext.addEventListener('click', ()=>{ stopAuto(); next(); });
  btnPrev.addEventListener('click', ()=>{ stopAuto(); prev(); });

  // 表のリンククリックで該当スライドへ
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('a.jump[data-target]');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('data-target');
    if (!(id in idToIndex)) return;

    // まずスライダー位置へスクロール
    document.getElementById('carousel').scrollIntoView({behavior:'smooth', block:'start'});
    // 少し待ってから目的スライドへ移動＆ハイライト
    setTimeout(()=> goTo(idToIndex[id], {highlight:true}), 250);
    stopAuto();
  });

  // 「写真を見る」ボタン → スライダーの位置へ
  btnView?.addEventListener('click', ()=>{
    document.getElementById('carousel').scrollIntoView({behavior:'smooth', block:'start'});
    stopAuto();
  });

  // 初期化
  startAuto();
})();
