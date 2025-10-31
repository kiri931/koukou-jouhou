import os

# 対象ディレクトリ（あなたの構成に合わせて変更可能）
BASE_DIR = os.path.join("..", "..", "docs")

# 挿入するタグ
INSERT_TAG = '<script src="js/analytics.js"></script>'

def insert_tag_in_html(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # すでにタグが入っていたらスキップ
    if INSERT_TAG in content:
        print(f"✔ 既に挿入済み: {file_path}")
        return

    # <head> の直後に挿入
    if "<head>" in content:
        new_content = content.replace("<head>", f"<head>\n    {INSERT_TAG}")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"✅ 挿入完了: {file_path}")
    else:
        print(f"⚠ <head>タグが見つかりません: {file_path}")

def main():
    for root, _, files in os.walk(BASE_DIR):
        for file in files:
            if file.endswith(".html"):
                file_path = os.path.join(root, file)
                insert_tag_in_html(file_path)

if __name__ == "__main__":
    main()
