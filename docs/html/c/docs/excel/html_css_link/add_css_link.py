import os
import shutil
from bs4 import BeautifulSoup

# 出力先フォルダ
output_dir = "output_html"
os.makedirs(output_dir, exist_ok=True)

# CSSファイルをコピー
css_filename = "style.css"
if os.path.exists(css_filename):
    shutil.copy(css_filename, output_dir)
    print(f"{css_filename} を {output_dir}/ にコピーしました。")
else:
    print(f"{css_filename} が見つかりません。CSSはコピーされませんでした。")

# テーマ切替用HTMLとJS
toggle_html = '''
<header class="theme-header">
  <span>🌓 テーマ:</span>
  <button id="theme-toggle">ライトモード</button>
</header>
'''

toggle_script = '''
<script>
  const toggleBtn = document.getElementById('theme-toggle');
  const body = document.body;

  const setHighlightTheme = (darkMode) => {
    document.getElementById("hljs-light").disabled = darkMode;
    document.getElementById("hljs-dark").disabled = !darkMode;
  };

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    body.classList.add('dark-mode');
    toggleBtn.textContent = 'ダークモード';
    setHighlightTheme(true);
  } else {
    setHighlightTheme(false);
  }

  toggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    toggleBtn.textContent = isDark ? 'ダークモード' : 'ライトモード';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setHighlightTheme(isDark);
  });
</script>
'''

# highlight.js の読み込み
highlight_links = '''
<link id="hljs-light" rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css" />
<link id="hljs-dark" rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css"
  disabled />
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
<script>hljs.highlightAll();</script>
'''

# 目次用のJS
toc_toggle_script = '''
<script>
  const tocBtn = document.querySelector('.toc-toggle');
  const toc = document.querySelector('.toc');
  if (tocBtn && toc) {
    tocBtn.addEventListener('click', () => {
      toc.classList.toggle('collapsed');
      tocBtn.textContent = toc.classList.contains('collapsed') ? '📖 目次を表示' : '📕 目次を隠す';
    });
  }
</script>
'''

# 言語自動判別関数
def detect_language(code_text):
    code_text = code_text.lower()
    if "def " in code_text or "import " in code_text or "print(" in code_text:
        return "python"
    elif "function " in code_text or "console.log" in code_text or "let " in code_text or "var " in code_text:
        return "javascript"
    elif "#include" in code_text or "printf(" in code_text:
        return "c"
    elif "<html" in code_text or "</div>" in code_text or "<!doctype" in code_text:
        return "html"
    elif "select " in code_text and "from " in code_text:
        return "sql"
    elif "public static void main" in code_text:
        return "java"
    else:
        return "plaintext"

# HTMLファイル処理
for filename in os.listdir("."):
    if filename.endswith(".html"):
        with open(filename, "r", encoding="utf-8") as file:
            soup = BeautifulSoup(file, "html.parser")

        head = soup.find("head")
        if head:
            if not soup.find("link", href="style.css"):
                head.append(soup.new_tag("link", rel="stylesheet", href="style.css"))

            if "highlight.min.js" not in str(soup):
                head.append(BeautifulSoup(highlight_links, "html.parser"))

        # コードに言語クラス追加
        for code_tag in soup.find_all("code"):
            if code_tag.parent.name == "pre":
                if not any(cls.startswith("language-") for cls in code_tag.get("class", [])):
                    lang = detect_language(code_tag.get_text())
                    code_tag["class"] = [f"language-{lang}"]

        body = soup.find("body")
        if body:
            if not soup.find("header", {"class": "theme-header"}):
                body.insert(0, BeautifulSoup(toggle_html, "html.parser"))
                body.append(BeautifulSoup(toggle_script, "html.parser"))

            # 目次の折りたたみ対応：h2#目次と次のulをラップ
            toc_h2 = soup.find("h2", {"id": "目次"})
            if toc_h2:
                toc_ul = toc_h2.find_next_sibling("ul")
                if toc_ul:
                    toc_container = soup.new_tag("div", attrs={"class": "toc-container"})
                    toggle_btn = soup.new_tag("button", attrs={"class": "toc-toggle"})
                    toggle_btn.string = "📖 目次を表示"
                    toc_div = soup.new_tag("div", attrs={"class": "toc collapsed"})
                    
                    # 移動してラップ
                    toc_div.append(toc_h2.extract())
                    toc_div.append(toc_ul.extract())
                    toc_container.append(toggle_btn)
                    toc_container.append(toc_div)

                    # 最初のbodyに挿入
                    body.insert(1, toc_container)

                    # JSを追加（最後に1回）
                    if "toc-toggle" not in str(soup):
                        body.append(BeautifulSoup(toc_toggle_script, "html.parser"))

        # 保存
        output_path = os.path.join(output_dir, filename)
        with open(output_path, "w", encoding="utf-8") as out_file:
            out_file.write(str(soup.prettify()))

        print(f"{filename} を変換し、{output_dir}/ に保存しました。")
