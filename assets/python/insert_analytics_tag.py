# アナリティクスようのタグのパスを修正するスクリプト
import os

BASE_DIR = os.path.join("..", "..", "docs")

old_tag = '<script src="js/analytics.js"></script>'
new_tag = '<script src="/js/analytics.js"></script>'

def fix_html(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    if old_tag in content:
        new_content = content.replace(old_tag, new_tag)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"✅ 修正済み: {file_path}")

def main():
    docs_dir = os.path.abspath(BASE_DIR)
    for root, _, files in os.walk(docs_dir):
        for file in files:
            if file.endswith(".html"):
                fix_html(os.path.join(root, file))

if __name__ == "__main__":
    main()
