const DEFAULT_COUNT = 10; // 既定の出題数

// MathJax 再描画
function mjTypeset() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        return window.MathJax.typesetPromise();
    } else if (window.MathJax && window.MathJax.typeset) {
        window.MathJax.typeset();
        return Promise.resolve();
    }
    return Promise.resolve();
}

// 配列をシャッフル
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// 問題DOM生成
function createQuestionDOM(q, index) {
    const sec = document.createElement('section');
    sec.className = 'card question';
    sec.dataset.answer = q.answer; // 正解（TeX文字列）

    const h3 = document.createElement('h3');
    h3.textContent = `Q${index + 1}`;
    const p = document.createElement('p');
    p.innerHTML = q.prompt; // TeX 含む

    sec.appendChild(h3);
    sec.appendChild(p);

    // 選択肢（ランダム順に並べ替え）
    const shuffledChoices = shuffle(q.choices);

    // 横並び用コンテナ
    const choicesWrap = document.createElement('div');
    choicesWrap.className = 'choices';

    shuffledChoices.forEach((choice, i) => {
        const id = `q${index + 1}_${i + 1}`;
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `q${index + 1}`;
        input.value = choice;
        input.id = id;

        const span = document.createElement('span');
        span.innerHTML = `\\(${choice}\\)`; // TeX表示

        label.appendChild(input);
        label.appendChild(span);
        choicesWrap.appendChild(label);
    });

    sec.appendChild(choicesWrap);

    // 解説（採点後に自動展開）
    if (q.explain) {
        const det = document.createElement('details');
        det.className = 'explain';
        const sum = document.createElement('summary');
        sum.textContent = '解説';
        const body = document.createElement('div');
        body.innerHTML = q.explain; // TeX含む
        det.appendChild(sum);
        det.appendChild(body);
        sec.appendChild(det);
    }

    return sec;
}

async function loadAndRender() {
    const root = document.getElementById('questionsRoot');
    root.innerHTML = '';

    const qCountInput = document.getElementById('qCount');
    const desiredCount = Math.max(1, Math.min(50, Number(qCountInput.value) || DEFAULT_COUNT));
    document.getElementById('qCountLabel').textContent = desiredCount;

    // 問題バンク読み込み
    const res = await fetch('questions.json');
    const bank = await res.json();
    if (!Array.isArray(bank) || bank.length === 0) {
        root.innerHTML = '<p class="card">問題データが読み込めませんでした。</p>';
        return;
    }

    const picked = shuffle(bank).slice(0, Math.min(desiredCount, bank.length));

    picked.forEach((q, i) => root.appendChild(createQuestionDOM(q, i)));

    await mjTypeset();
}

function grade() {
    const questions = document.querySelectorAll('.question');
    let correct = 0;
    questions.forEach((q, idx) => {
        const name = `q${idx + 1}`;
        const picked = document.querySelector(`input[name="${name}"]:checked`);
        const expected = q.dataset.answer; // 例: x=\dfrac{5y-7}{3}

        // 表示している選択肢は \(choice\) で包んでいるが、value は元の TeX 文字列
        q.querySelectorAll('label').forEach(l => l.classList.remove('right', 'wrong'));
        if (!picked) return; // 未選択

        if (picked.value === expected) {
            correct++;
            picked.parentElement.classList.add('right');
        } else {
            picked.parentElement.classList.add('wrong');
            const ok = Array.from(q.querySelectorAll('input')).find(i => i.value === expected);
            if (ok) ok.parentElement.classList.add('right');
        }

        const det = q.querySelector('details.explain');
        if (det) det.open = true;
    });

    const score = document.getElementById('score');
    const feedback = document.getElementById('feedback');
    const result = document.getElementById('result');

    score.textContent = correct;
    result.hidden = false;

    let msg = '';
    const total = questions.length;
    if (correct === total) msg = '満点！移項と係数処理が完璧です。';
    else if (correct >= Math.ceil(total * 0.8)) msg = 'とても良いです。符号と割り算の扱いを再確認すると満点が見えます。';
    else if (correct >= Math.ceil(total * 0.5)) msg = '基礎はできています。移項時の符号ミスに注意！';
    else msg = 'まずは移項→係数で割るの手順を丁寧に練習しましょう。';
    feedback.textContent = msg;

    mjTypeset();
}

function resetAll() {
    document.querySelectorAll('input[type="radio"]').forEach(i => i.checked = false);
    document.querySelectorAll('label').forEach(l => l.classList.remove('right', 'wrong'));
    document.getElementById('result').hidden = true;
    document.querySelectorAll('details.explain').forEach(d => d.open = false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function printA4() {
    window.print();
}

// イベント
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('gradeBtn').addEventListener('click', grade);
    document.getElementById('resetBtn').addEventListener('click', resetAll);
    document.getElementById('printBtn').addEventListener('click', printA4);
    document.getElementById('reloadBtn').addEventListener('click', loadAndRender);
    document.getElementById('qCount').addEventListener('change', loadAndRender);
    loadAndRender();
});