#!/usr/bin/env python3
"""将 items_with_answers.jsonl 转换为 Web 可用的 questions.json"""
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).parent.parent
IN_PATH = ROOT / "output" / "jsonl_v2" / "items_with_answers.jsonl"
OUT_DIR = ROOT / "output" / "web_import"
OUT_PATH = OUT_DIR / "questions.json"
OUT_DIR.mkdir(parents=True, exist_ok=True)

KIND_MAP = {
    "image_true_false": "image_true_false",
    "image_choice": "image_choice",
    "dialogue_image_choice": "image_choice",
    "audio_text_choice": "single_choice",
    "image_word_judge": "image_true_false",
    "sentence_image_choice": "image_choice",
    "matching": "matching",
    "fill_blank": "fill_blank",
}


def convert_item(item: dict) -> dict | None:
    answer_val = item.get("answer", {}).get("value")
    if answer_val is None:
        return None

    item_type = item.get("item_type", "single_choice")
    kind = KIND_MAP.get(item_type, "single_choice")
    section = item.get("section", "阅读")
    part = item.get("part", 1)
    qno = item.get("question_no", 0)

    raw_options = item.get("options", [])
    if isinstance(raw_options, list) and raw_options:
        options = [
            {"id": chr(65 + i), "label": chr(65 + i), "text": str(opt)}
            for i, opt in enumerate(raw_options)
        ]
    else:
        options = []

    media_refs = item.get("media_refs", [])
    visual_hint = media_refs[0] if media_refs else None

    return {
        "id": item["item_id"],
        "title": f"{section}第{part}部分 第{qno}题",
        "level": "HSK1",
        "section": section,
        "part": part,
        "kind": kind,
        "prompt": item.get("stem", "").strip() or f"第 {qno} 题",
        "context": None,
        "visualHint": visual_hint,
        "options": options,
        "answer": answer_val,
        "explanation": "",
        "estimatedSeconds": 30 if section == "阅读" else 20,
        "vocabFocus": [],
        "sourceType": "re_authored",
        "reviewStatus": "approved",
        "publishStatus": "published",
        "copyrightStatus": "cleared",
        "tags": ["hsk1", section, f"part{part}"],
    }


def main():
    if not IN_PATH.exists():
        print(f"ERROR: {IN_PATH} not found. Run 06b_inject_answers.py first.")
        return

    items = [json.loads(l) for l in IN_PATH.read_text(encoding="utf-8").splitlines() if l.strip()]
    print(f"Input: {len(items)} items")

    questions = []
    skipped = 0
    for item in items:
        q = convert_item(item)
        if q:
            questions.append(q)
        else:
            skipped += 1

    OUT_PATH.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Output: {len(questions)} questions ({skipped} skipped), saved to {OUT_PATH}")

    counts = Counter((q["section"], q["part"]) for q in questions)
    for (sec, part), cnt in sorted(counts.items()):
        print(f"  {sec} Part {part}: {cnt} questions")


if __name__ == "__main__":
    main()
