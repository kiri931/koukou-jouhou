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

# トグル用HTMLとJS
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


# highlight.js の読み込み（ライトテーマ）
highlight_links = '''
<link id="hljs-light" rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css" />
<link id="hljs-dark" rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css"
  disabled />
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
<script>hljs.highlightAll();</script>
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

        # <head> に CSS や highlight.js を追加
        head = soup.find("head")
        if head:
            # style.css が無ければ追加
            if not soup.find("link", href="style.css"):
                style_tag = soup.new_tag("link", rel="stylesheet", href="style.css")
                head.append(style_tag)

            # highlight.js のCDNを追加（すでに含まれてない場合）
            if "highlight.min.js" not in str(soup):
                highlight_soup = BeautifulSoup(highlight_links, "html.parser")
                head.append(highlight_soup)

        # <pre><code> に language-xxx クラス自動追加
        for code_tag in soup.find_all("code"):
            parent = code_tag.parent
            if parent.name == "pre":
                current_classes = code_tag.get("class", [])
                if not any(cls.startswith("language-") for cls in current_classes):
                    lang = detect_language(code_tag.get_text())
                    code_tag["class"] = [f"language-{lang}"]

        # トグルUIの挿入（重複防止）
        body = soup.find("body")
        if body:
            if not soup.find("header", {"class": "theme-header"}):
                body.insert(0, BeautifulSoup(toggle_html, "html.parser"))
                body.append(BeautifulSoup(toggle_script, "html.parser"))

        # 保存
        output_path = os.path.join(output_dir, filename)
        with open(output_path, "w", encoding="utf-8") as out_file:
            out_file.write(str(soup.prettify()))

        print(f"{filename} を変換し、{output_dir}/ に保存しました。")
