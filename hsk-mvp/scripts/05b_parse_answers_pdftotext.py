#!/usr/bin/env python3
"""从答案 PDF 用 pdftotext 提取答案，输出到 output/answers/{paper_id}_answers.json"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
RAW_DIR = ROOT / "data" / "raw" / "hsk1"
OUT_DIR = ROOT / "output" / "answers"
OUT_DIR.mkdir(parents=True, exist_ok=True)

ANSWER_PDF_PATTERNS = [
    "*答案.pdf",
    "* 答案.pdf",
    "*卷答案.pdf",
    "* 卷答案.pdf",
    "*_Loesungen.pdf",
]

PART_LABELS = {
    "第一部分": 1,
    "第二部分": 2,
    "第三部分": 3,
    "第四部分": 4,
}

SECTION_LABELS = {
    "听": "听力",
    "听力": "听力",
    "阅": "阅读",
    "阅读": "阅读",
}


def extract_text(pdf_path: Path) -> str:
    result = subprocess.run(
        ["pdftotext", str(pdf_path), "-"],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return result.stdout


def parse_paper_id(text: str, filename: str) -> str:
    first_line = text.strip().split("\n")[0]
    # Match patterns like "H11555D 卷答案" or "H11006卷答案"
    m = re.match(r"([A-Z0-9]+)\s*[卷答案]", first_line)
    if m:
        return m.group(1)
    stem = Path(filename).stem
    stem = re.sub(r"[\s_]?答案|[\s_]?卷答案|[\s_]?Loesungen", "", stem)
    return stem.strip()


def parse_answers(text: str) -> dict:
    answers = {}
    current_section = "听力"
    current_part = 1

    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Detect section: lines like "一、听 力" or "二、阅 读"
        if re.search(r"[一二]、", line):
            for key, val in SECTION_LABELS.items():
                if key in line:
                    current_section = val
                    break

        # Detect part
        for label, num in PART_LABELS.items():
            if label in line:
                current_part = num
                break

        # Extract answers: "1．√" "9．A" "24． √" (note space before √)
        for m in re.finditer(r"(\d+)[．.]\s*([√×A-Fa-f])", line):
            qno = m.group(1)
            ans = m.group(2).upper()
            answers[qno] = {
                "answer": ans,
                "section": current_section,
                "part": current_part,
            }

    return answers


def process_pdf(pdf_path: Path) -> dict | None:
    text = extract_text(pdf_path)
    if len(text.strip()) < 20:
        print(f"  SKIP (no text): {pdf_path.name}", file=sys.stderr)
        return None

    paper_id = parse_paper_id(text, pdf_path.name)
    answers = parse_answers(text)

    if not answers:
        print(f"  SKIP (no answers parsed): {pdf_path.name}", file=sys.stderr)
        return None

    return {
        "paper_id": paper_id,
        "source_file": pdf_path.name,
        "answer_count": len(answers),
        "answers": answers,
    }


def main():
    pdf_files = []
    seen = set()
    for pattern in ANSWER_PDF_PATTERNS:
        for f in RAW_DIR.glob(pattern):
            if f not in seen:
                seen.add(f)
                pdf_files.append(f)

    pdf_files = sorted(pdf_files)
    print(f"Found {len(pdf_files)} answer PDFs")

    success, skip = 0, 0
    for pdf_path in pdf_files:
        result = process_pdf(pdf_path)
        if result is None:
            skip += 1
            continue

        out_path = OUT_DIR / f"{result['paper_id']}_answers.json"
        out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  OK {result['paper_id']}: {result['answer_count']} answers -> {out_path.name}")
        success += 1

    print(f"\nDone: {success} success, {skip} skipped")


if __name__ == "__main__":
    main()
