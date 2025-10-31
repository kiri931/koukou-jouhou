# 重複したアナリティクスタグを削除するスクリプト
import os
import re

# docsディレクトリの場所（assets/python から2階層上）
BASE_DIR = os.path.join("..", "..", "docs")

# 対象タグ（正確にマッチさせる）
TAG_PATTERN = r'<script\s+src="/js/analytics\.js"></script>'

def clean_html(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 該当タグをすべて検索
    matches = re.findall(TAG_PATTERN, content)
    count = len(matches)

    if count > 1:
        # 最初の1つだけ残して、他を削除
        new_content = re.sub(TAG_PATTERN, "", content)  # いったん全部消す
        # 最初の<head>直後に1つだけ再挿入
        new_content = re.sub(r"<head>", "<head>\n    <script src=\"/js/analytics.js\"></script>", new_content, count=1)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"🧹 {file_path} から {count-1} 個の重複タグを削除しました")
    elif count == 1:
        print(f"✔ {file_path} はOK（1つだけ）")
    else:
        print(f"⚠ {file_path} にタグが見つかりません")

def main():
    docs_dir = os.path.abspath(BASE_DIR)
    print(f"対象ディレクトリ: {docs_dir}")
    for root, _, files in os.walk(docs_dir):
        for file in files:
            if file.endswith(".html"):
                clean_html(os.path.join(root, file))

if __name__ == "__main__":
    main()
