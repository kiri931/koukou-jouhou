#!/usr/bin/env python3
"""
分野別演習システムの動作確認スクリプト
"""
import json
import sys
from pathlib import Path

def check_file(filepath, expected_keys):
    """JSONファイルの構造をチェック"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            return False, f"配列ではありません: {type(data)}"
        
        if len(data) == 0:
            return False, "空の配列です"
        
        # 最初の要素のキーをチェック
        first = data[0]
        missing = [k for k in expected_keys if k not in first]
        
        if missing:
            return False, f"必須キーが不足: {missing}"
        
        return True, f"OK ({len(data)}問)"
    
    except Exception as e:
        return False, str(e)

def main():
    base = Path(__file__).parent.parent
    
    print("=" * 70)
    print("情報技術検定3級 分野別演習システム - 動作確認")
    print("=" * 70)
    
    checks = [
        {
            "file": base / "data" / "practice" / "mondai1.json",
            "keys": ["id", "question", "options", "answer"],
            "name": "基本用語"
        },
        {
            "file": base / "data" / "practice" / "mondai2.json",
            "keys": ["id", "question", "options", "answer"],
            "name": "計算・論理回路"
        },
        {
            "file": base / "data" / "practice" / "mondai3.json",
            "keys": ["id", "category", "title", "description", "flow_steps", "choices", "answers"],
            "name": "フローチャート"
        },
        {
            "file": base / "data" / "practice" / "mondai4.json",
            "keys": ["id", "title", "description", "program_c", "program_basic", "choices", "answers"],
            "name": "プログラミング"
        }
    ]
    
    all_ok = True
    total_questions = 0
    
    for check in checks:
        ok, msg = check_file(check["file"], check["keys"])
        status = "✓" if ok else "✗"
        print(f"\n[{status}] {check['name']:20} : {msg}")
        
        if ok:
            # 問題数を抽出
            count = int(msg.split("(")[1].split("問")[0])
            total_questions += count
        else:
            all_ok = False
    
    print("\n" + "=" * 70)
    print(f"合計: {total_questions}問")
    
    # 実装ファイルのチェック
    print("\n" + "=" * 70)
    print("実装ファイル")
    print("=" * 70)
    
    impl_files = [
        base / "practice" / "index.html",
        base / "practice" / "practice.js",
        base / "practice" / "practice-loader.js",
        base / "practice" / "practice-engine.js",
        base / "practice" / "README.md",
    ]
    
    for f in impl_files:
        exists = f.exists()
        status = "✓" if exists else "✗"
        size = f"{f.stat().st_size / 1024:.1f}KB" if exists else "-"
        print(f"[{status}] {f.name:25} : {size}")
    
    print("\n" + "=" * 70)
    
    if all_ok:
        print("✓ すべてのチェックに合格しました！")
        print("\n起動方法:")
        print("  python3 -m http.server 8080")
        print("  http://localhost:8080/practice/")
        return 0
    else:
        print("✗ 一部のチェックに失敗しました")
        return 1

if __name__ == "__main__":
    sys.exit(main())
