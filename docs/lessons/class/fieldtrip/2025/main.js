// Print button
document.getElementById('printBtn')?.addEventListener('click', () => window.print());

// IntersectionObserver for appear-on-scroll
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) e.target.classList.add('is-visible');
}, { threshold: .15 });
document.querySelectorAll('.appear').forEach(el => io.observe(el));

// carousel-track を動かすスライダ（自動送り＋スワイプ）
for (const track of document.querySelectorAll('.carousel-track')) {
  const autoplay = Number(track.dataset.autoplay || 0);
  const slides = track.querySelectorAll('img');
  const count  = slides.length;
  if (!count) continue;

  let index = 0;
  const vp = track.parentElement; // .carousel-viewport

  function w(){ return vp.clientWidth; }
  function go(i){
    index = (i + count) % count;
    track.style.transform = `translateX(${-index * w()}px)`;
  }

  // 自動送り
  let timer = null;
  function start(){ if (autoplay && count > 1 && !timer) timer = setInterval(()=>go(index+1), autoplay); }
  function stop(){ if (timer){ clearInterval(timer); timer = null; } }
  start();

  // スワイプ
  let startX = 0, startTx = 0, dragging = false;
  track.addEventListener('touchstart', (e) => {
    dragging = true;
    startX = e.touches[0].clientX;
    startTx = -index * w();
    track.style.transition = 'none';
    stop();
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX;
    track.style.transform = `translateX(${startTx + dx}px)`;
  }, { passive: true });

  function end(){
    if (!dragging) return;
    dragging = false;
    const m = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41 - startTx;
    const th = w() * 0.2;
    if (m < -th) index++;
    else if (m > th) index--;
    track.style.transition = 'transform .6s ease';
    go(index);
    start();
  }
  track.addEventListener('touchend', end);
  track.addEventListener('touchcancel', end);

  // 初期位置 & リサイズ対応
  go(0);
  addEventListener('resize', () => { track.style.transition = 'none'; go(index); setTimeout(()=>track.style.transition='transform .6s ease'); });
}


// Countdown timer (Asia/Tokyo)
(function(){
  const el = document.getElementById('countdown');
  if (!el) return;
  const target = new Date('2025-10-03T09:40:00+09:00'); // 集合時間
  function tick(){
    const now = new Date();
    const diff = target - now;
    if (diff <= 0){
      el.textContent = '今日は校外学習当日！';
      el.classList.add('ok');
      return;
    }
    const s = Math.floor(diff/1000);
    const d = Math.floor(s/86400);
    const h = Math.floor((s%86400)/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    el.textContent = `あと ${d}日 ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    el.classList.toggle('warn', d < 3);
    requestAnimationFrame(()=>setTimeout(tick, 1000));
  }
  tick();
})();

// Checklist with localStorage
(function(){
  const KEY = 'trip_checklist_v1';
  const form = document.getElementById('checklistForm');
  const addBtn = document.getElementById('addItemBtn');
  const input = document.getElementById('newItem');

  function load(){
    try{
      const data = JSON.parse(localStorage.getItem(KEY) || '{}');
      // restore checks
      if (data.checks){
        for (const value of data.checks){
          const el = form.querySelector(`input[value="${CSS.escape(value)}"]`);
          if (el) el.checked = true;
        }
      }
      // restore custom items
      if (data.custom && Array.isArray(data.custom)){
        for (const label of data.custom){
          addItem(label, false);
        }
      }
    }catch(e){}
  }
  function save(){
    const checks = Array.from(form.querySelectorAll('input[type="checkbox"]:checked')).map(el=>el.value);
    const custom = Array.from(form.querySelectorAll('label[data-custom="1"]')).map(l=>l.textContent.trim());
    localStorage.setItem(KEY, JSON.stringify({checks, custom}));
  }
  function addItem(labelText, checked=true){
    const id = 'custom_' + Math.random().toString(36).slice(2);
    const label = document.createElement('label');
    label.setAttribute('data-custom','1');
    label.innerHTML = `<input type="checkbox" name="item" value="${id}" ${checked?'checked':''}> ${labelText}`;
    form.appendChild(label);
    save();
  }

  form.addEventListener('change', save);
  addBtn?.addEventListener('click', ()=>{
    const t = (input?.value || '').trim();
    if (!t) return;
    addItem(t, true);
    input.value = '';
  });

  load();
})();