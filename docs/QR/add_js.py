import os

# チェックする親フォルダ
targets = ["1", "2", "3"]

# 追加するスクリプトタグ
SCRIPT_TAG = '<script src="../../js/marge.js"></script>'

for folder in targets:
    for i in range(1, 41):  # 01〜40
        subfolder = f"{i:02d}"  # ← 01 〜 40 に変換
        index_path = os.path.join(folder, subfolder, "index.html")

        if not os.path.exists(index_path):
            print(f"❌ 見つからない: {index_path}")
            continue

        with open(index_path, "r", encoding="utf-8") as f:
            html = f.read()

        # すでに挿入済みならスキップ
        if SCRIPT_TAG in html:
            print(f"スキップ（既に追加済）: {index_path}")
            continue

        # <head> の直後に挿入
        if "<head>" in html:
            new_html = html.replace("<head>", f"<head>\n    {SCRIPT_TAG}")
        else:
            print(f"⚠ headタグが見つからない: {index_path}")
            continue

        with open(index_path, "w", encoding="utf-8") as f:
            f.write(new_html)

        print(f"✔ 追加: {index_path}")

print("完了！")
