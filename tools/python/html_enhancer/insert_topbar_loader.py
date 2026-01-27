"""Insert dg-topbar loader snippet into HTML files under docs/.

- Adds a small inline loader that tries both:
  - /assets/js/dg-topbar.js
  - /<firstSeg>/assets/js/dg-topbar.js
  This matches the analytics loader strategy and works for both custom domains
  and GitHub Pages project paths.

Safe to run multiple times (idempotent).

Usage:
  python tools/python/html_enhancer/insert_topbar_loader.py
"""

from __future__ import annotations

import os

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DOCS_DIR = os.path.join(REPO_ROOT, "docs")

SNIPPET_ID = "dg-topbar-loader"

SNIPPET = f"""\
<script id=\"{SNIPPET_ID}\">\n(function () {{\n  const firstSeg = (location.pathname.split(\"/\")[1] || \"\").trim();\n  const candidates = [\"/assets/js/dg-topbar.js\"];\n  if (firstSeg) candidates.push(\"/\" + firstSeg + \"/assets/js/dg-topbar.js\");\n\n  function load(i) {{\n    if (i >= candidates.length) return;\n    const s = document.createElement(\"script\");\n    s.src = candidates[i];\n    s.defer = true;\n    s.onerror = () => load(i + 1);\n    document.head.appendChild(s);\n  }}\n\n  load(0);\n}})();\n</script>\n"""


def should_process_html(path: str) -> bool:
    if not path.lower().endswith(".html"):
        return False
    # skip generated/service worker-like files if needed (none for now)
    return True


def insert_before_head_close(html: str) -> str:
    lower = html.lower()
    idx = lower.rfind("</head>")
    if idx == -1:
        return html
    return html[:idx] + SNIPPET + html[idx:]


def main() -> None:
    changed = 0
    scanned = 0

    for root, _, files in os.walk(DOCS_DIR):
        for name in files:
            path = os.path.join(root, name)
            if not should_process_html(path):
                continue

            scanned += 1
            with open(path, "r", encoding="utf-8") as f:
                html = f.read()

            if SNIPPET_ID in html:
                continue

            new_html = insert_before_head_close(html)
            if new_html == html:
                continue

            with open(path, "w", encoding="utf-8") as f:
                f.write(new_html)

            changed += 1

    print(f"scanned={scanned} changed={changed}")


if __name__ == "__main__":
    main()
