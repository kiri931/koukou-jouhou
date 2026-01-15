const htmlEditor = document.getElementById("html-editor");
const cssEditor = document.getElementById("css-editor");
const preview = document.getElementById("preview");
const tagTitle = document.getElementById("tag-title");
const tagDesc = document.getElementById("tag-desc");
const cssDesc = document.getElementById("css-desc");
const cssPatterns = document.getElementById("css-patterns");
const menu = document.getElementById("menu");
const menuToggle = document.getElementById("menu-toggle");
const tagList = document.getElementById("tag-list");

let lessons = [];
let currentIndex = 0;

fetch("data/lessons.json")
  .then(res => res.json())
  .then(data => {
    lessons = data;
    createMenu();
    loadLesson(0);
  });

function createMenu() {
  tagList.innerHTML = lessons
    .map((l, i) => `<li data-index="${i}">${l.tag} — ${l.name}</li>`)
    .join("");

  tagList.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", () => {
      loadLesson(Number(li.dataset.index));
      menu.classList.remove("show");
    });
  });
}

menuToggle.addEventListener("click", () => {
  menu.classList.toggle("show");
});

function loadLesson(index) {
  const l = lessons[index];
  currentIndex = index;
  tagTitle.textContent = `${l.tag}タグ（${l.name}）`;
  tagDesc.textContent = l.desc;
  htmlEditor.value = l.html;
  cssEditor.value = l.css;
  cssDesc.textContent = l.css_desc || "";

  cssPatterns.innerHTML = (l.css_patterns || [])
    .map(p => `
      <div class="pattern">
        <pre><code>${p.code}</code></pre>
        <p>${p.explain}</p>
      </div>
    `)
    .join("");

  updatePreview();
}

function updatePreview() {
  const code = `
    <link rel="stylesheet" href="../../docs/assets/css/study.css">
    <style>${cssEditor.value}</style>
    ${htmlEditor.value}
  `;
  preview.srcdoc = code;
}

htmlEditor.addEventListener("input", updatePreview);
cssEditor.addEventListener("input", updatePreview);

document.getElementById("next").addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % lessons.length;
  loadLesson(currentIndex);
});

document.getElementById("prev").addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + lessons.length) % lessons.length;
  loadLesson(currentIndex);
});
