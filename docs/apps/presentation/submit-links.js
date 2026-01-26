// submit-links.js

(() => {
  const STORAGE_KEY_THEME = 'presentation.theme';
  const STORAGE_KEY_STUDENT = 'presentation.formUrl.student';
  const STORAGE_KEY_TEACHER = 'presentation.formUrl.teacher';

  function getTheme() {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.style.display = 'none', 1500);
  }

  async function copyText(text) {
    if (!text.trim()) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    applyTheme(getTheme());

    document.getElementById('btnTheme')?.addEventListener('click', () => {
      const next = (document.documentElement.dataset.theme === 'dark') ? 'light' : 'dark';
      applyTheme(next);
    });

    const studentInput = document.getElementById('studentUrl');
    const teacherInput = document.getElementById('teacherUrl');

    if (studentInput) studentInput.value = localStorage.getItem(STORAGE_KEY_STUDENT) || '';
    if (teacherInput) teacherInput.value = localStorage.getItem(STORAGE_KEY_TEACHER) || '';

    studentInput?.addEventListener('input', () => localStorage.setItem(STORAGE_KEY_STUDENT, studentInput.value));
    teacherInput?.addEventListener('input', () => localStorage.setItem(STORAGE_KEY_TEACHER, teacherInput.value));

    document.getElementById('openStudent')?.addEventListener('click', () => {
      const url = studentInput?.value || '';
      if (!url.trim()) return toast('生徒用URLが空です');
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    document.getElementById('openTeacher')?.addEventListener('click', () => {
      const url = teacherInput?.value || '';
      if (!url.trim()) return toast('教師用URLが空です');
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    document.getElementById('copyStudent')?.addEventListener('click', async () => {
      const ok = await copyText(studentInput?.value || '');
      toast(ok ? '生徒用URLをコピーしました' : 'コピーできませんでした');
    });

    document.getElementById('copyTeacher')?.addEventListener('click', async () => {
      const ok = await copyText(teacherInput?.value || '');
      toast(ok ? '教師用URLをコピーしました' : 'コピーできませんでした');
    });
  });
})();
