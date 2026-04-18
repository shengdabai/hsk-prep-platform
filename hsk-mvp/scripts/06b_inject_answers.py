#!/usr/bin/env python3
"""将 output/answers/ 中的答案注入 items.jsonl，输出 items_with_answers.jsonl"""
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
ITEMS_PATH = ROOT / "output" / "jsonl_v2" / "items.jsonl"
ANSWERS_DIR = ROOT / "output" / "answers"
OUT_PATH = ROOT / "output" / "jsonl_v2" / "items_with_answers.jsonl"


def load_answers() -> dict[str, dict]:
    result = {}
    for json_path in ANSWERS_DIR.glob("*_answers.json"):
        data = json.loads(json_path.read_text(encoding="utf-8"))
        paper_id = data["paper_id"]
        result[paper_id] = data["answers"]
    return result


def main():
    if not ITEMS_PATH.exists():
        print(f"ERROR: {ITEMS_PATH} not found")
        return

    answers_map = load_answers()
    print(f"Loaded answers for {len(answers_map)} papers")

    items = [json.loads(line) for line in ITEMS_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
    print(f"Loaded {len(items)} items")

    injected = 0
    not_found = 0
    out_lines = []

    for item in items:
        paper_id = item.get("paper_id", "")
        question_no = str(item.get("question_no", ""))

        paper_answers = answers_map.get(paper_id, {})
        answer_info = paper_answers.get(question_no)

        if answer_info:
            item["answer"] = {
                "value": answer_info["answer"],
                "source": "aligned",
                "confidence": 1.0,
            }
            item["section"] = answer_info["section"]
            item["part"] = answer_info["part"]
            injected += 1
        else:
            not_found += 1

        out_lines.append(json.dumps(item, ensure_ascii=False))

    OUT_PATH.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    print(f"Injected: {injected}, missing: {not_found}")
    print(f"Output: {OUT_PATH}")


if __name__ == "__main__":
    main()
