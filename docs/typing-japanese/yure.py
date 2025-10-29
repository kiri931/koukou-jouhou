# yure_converter.py
import json
import os

# ヘボン式・訓令式のローマ字ゆれ
romaji_yure_table = {
    "shi": ["si"],
    "sha": ["sya"],
    "shu": ["syu"],
    "sho": ["syo"],
    "chi": ["ti"],
    "cha": ["tya"],
    "chu": ["tyu"],
    "cho": ["tyo"],
    "ji": ["zi"],
    "ja": ["zya"],
    "ju": ["zyu"],
    "jo": ["zyo"],
    "tsu": ["tu"],
    "fu": ["hu"],
    "di": ["de"],
    "du": ["do"],
    "thi": ["texi"],
    "twu": ["tuxu"],
    "wi": ["ui"],
    "we": ["ue"],
    "wo": ["o"],
    "kwa": ["kuwa"],
    "gya": ["giya"],
    "gyu": ["giyu"],
    "gyo": ["giyo"]
}

def expand_yure(base_answer: str):
    """ローマ字のゆれに基づいてバリエーションを生成"""
    results = set([base_answer])
    for key, variants in romaji_yure_table.items():
        for result in list(results):
            if key in result:
                for variant in variants:
                    results.add(result.replace(key, variant))
    return sorted(results)

def process_json_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        problems = json.load(f)

    modified_count = 0

    for problem in problems:
        if "answer" in problem:
            base = problem["answer"]
            del problem["answer"]
            problem["answers"] = [base]

        original = set(problem["answers"])
        expanded = set()
        for ans in original:
            expanded.update(expand_yure(ans))
        problem["answers"] = sorted(expanded)

        if original != expanded:
            modified_count += 1
            print(f"📝 変更あり: {problem['question']}")
            print(f"  元: {sorted(original)}")
            print(f"  追加後: {sorted(expanded)}\n")

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(problems, f, ensure_ascii=False, indent=2)

    return modified_count

def main():
    directory = "./problems"
    if not os.path.exists(directory):
        print("❌ ./problems ディレクトリが見つかりません")
        return

    total_modified = 0
    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            filepath = os.path.join(directory, filename)
            print(f"✅ 処理中: {filepath}")
            modified = process_json_file(filepath)
            print(f"🔧 {modified} 件のエントリに変更が加えられました\n")
            total_modified += modified

    print(f"🎉 完了: 全体で {total_modified} 件のエントリにゆれが追加されました")

if __name__ == '__main__':
    main()