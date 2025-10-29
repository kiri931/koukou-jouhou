# 📄 add_css_link.py の使い方

このスクリプトは、同一フォルダ内のすべての HTML ファイルに `style.css` をリンクするためのツールです。  
HTMLファイルの `<head>` タグ内に以下のようなタグを自動で追加します：

```html
<link rel="stylesheet" href="style.css">
```

📦 必要な準備

1. Python のインストール
Python がまだインストールされていない場合は、公式サイトからインストールしてください。

2. 必要なライブラリをインストール
このスクリプトでは BeautifulSoup を使用します。以下のコマンドでインストールしてください：

```bash
pip install beautifulsoup4
```

🛠 スクリプトの設置
フォルダ内に以下の3つのファイルを準備してください：

add_css_link.py（スクリプト）

style.css（使用するスタイルシート）

.html ファイル（スタイルを適用したいHTML）

add_css_link.py の内容は以下の通り：

<details> <summary>クリックしてコードを見る</summary>
```python
import os
from bs4 import BeautifulSoup

for filename in os.listdir("."):
    if filename.endswith(".html"):
        with open(filename, "r", encoding="utf-8") as file:
            soup = BeautifulSoup(file, "html.parser")

        if soup.find("link", href="style.css"):
            print(f"{filename} はすでに style.css をリンクしています。スキップします。")
            continue

        head = soup.find("head")
        if not head:
            print(f"{filename} に <head> タグが見つかりません。スキップします。")
            continue

        new_link = soup.new_tag("link", rel="stylesheet", href="style.css")
        head.append(new_link)

        with open(filename, "w", encoding="utf-8") as file:
            file.write(str(soup.prettify()))

        print(f"{filename} に style.css のリンクを追加しました。")

```
</details>

▶ 実行方法
ターミナルやコマンドプロンプトを開きます。

スクリプトとHTMLファイルがあるディレクトリに移動します：

```bash
cd /path/to/your/folder
```

スクリプトを実行します：

```bash
python add_css_link.py
```

✅ 動作確認
実行後、各HTMLファイルの `<head>` に次のタグが追加されているか確認してください：

```html
<link rel="stylesheet" href="style.css">
```

ブラウザでHTMLを開くと、style.css のデザインが反映されます。

💡 注意事項
すでに style.css がリンクされている場合、スクリプトは重複追加しません。

<head> タグが存在しないHTMLファイルはスキップされます。

必要に応じて .css のファイル名や挿入場所をカスタマイズできます。
