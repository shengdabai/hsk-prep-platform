#!/usr/bin/env python3
"""
裁切题目图片：从整页PNG提取每题的图片区域
输出到 web/public/images/questions/{item_id}.png
同时更新 output/web_import/questions.json 中的 visualHint 字段

HSK1 标准题型布局（1191x1684像素）：
- 听力P1(q1-5):   page_002, 表格7行(2例+5题), 每行1图, 图在中间列
- 听力P2(q6-10):  page_003, 表格4行(1例+3题/页), 每行3图(A/B/C)
- 听力P3(q11-15): page_004, 上半6图(A-F)共用，裁整组
- 听力P4(q16-20): page_005, 纯文字，无图
- 阅读P1(q21-25): page_006, 表格7行(2例+5题), 每行1图+文字
- 阅读P2(q26-30): page_007, 每行5图选项，裁整行
- 阅读P3(q31-35): 纯文字匹配，无图
- 阅读P4(q36-40): 纯文字，无图
"""

import os
import json
from pathlib import Path
from PIL import Image

BASE = Path(__file__).parent.parent
PAGE_IMG_DIR = BASE / "output" / "page_images"
OUT_DIR = BASE / "web" / "public" / "images" / "questions"
QUESTIONS_JSON = BASE / "output" / "web_import" / "questions.json"

OUT_DIR.mkdir(parents=True, exist_ok=True)


def crop_and_save(img: Image.Image, box: tuple, out_path: Path, padding: int = 8):
    w, h = img.size
    left = max(0, box[0] - padding)
    top = max(0, box[1] - padding)
    right = min(w, box[2] + padding)
    bottom = min(h, box[3] + padding)
    if bottom <= top or right <= left:
        return None
    cropped = img.crop((left, top, right, bottom))
    cropped.save(out_path, "PNG", optimize=True)
    return out_path


def get_question_no(q: dict) -> int:
    try:
        return int(q["id"].rsplit("_q", 1)[1])
    except Exception:
        return 0


def group_by_section_part(questions: list) -> dict:
    """按 (section, part) 分组并排序"""
    groups = {}
    for q in questions:
        key = (q.get("section", ""), q.get("part", 0))
        groups.setdefault(key, []).append(q)
    for key in groups:
        groups[key] = sorted(groups[key], key=get_question_no)
    return groups


def process_paper(paper_dir: Path, paper_id: str, questions: list) -> dict:
    result = {}

    groups = group_by_section_part(questions)

    pages = {}
    for f in sorted(paper_dir.glob("page_*.png")):
        num = int(f.stem.split("_")[1])
        pages[num] = f

    if not pages:
        print(f"  [跳过] {paper_id}: 无页面图片")
        return result

    # ── 听力 Part1 (section=听力, part=1): 每题一图，page_002 ──
    ting_p1 = groups.get(("听力", 1), [])
    if ting_p1 and 2 in pages:
        img = Image.open(pages[2])
        w, h = img.size
        # 7行(2例+5题)，从 y=16% 到 y=97%
        table_top = int(h * 0.16)
        table_bottom = int(h * 0.97)
        row_h = (table_bottom - table_top) // 7
        img_left = int(w * 0.13)
        img_right = int(w * 0.59)

        for i, q in enumerate(ting_p1[:5]):  # 最多5题
            row_idx = i + 2  # 跳过2行例题
            top = table_top + row_idx * row_h
            bottom = top + row_h
            item_id = q["id"]
            out_path = OUT_DIR / f"{item_id}.png"
            if crop_and_save(img, (img_left, top, img_right, bottom), out_path):
                result[item_id] = f"/images/questions/{item_id}.png"
                print(f"  ✓ {item_id} (听力P1)")

    # ── 听力 Part2 (section=听力, part=2): 每题3图A/B/C，page_003 ──
    ting_p2 = groups.get(("听力", 2), [])
    if ting_p2 and 3 in pages:
        img = Image.open(pages[3])
        w, h = img.size
        # 4行(1例+最多3题/页)，第4、5题在下一页
        table_top = int(h * 0.04)
        table_bottom = int(h * 0.97)
        row_h = (table_bottom - table_top) // 4
        img_left = int(w * 0.13)
        img_right = int(w * 0.97)

        placed = 0
        for page_key in [3, 4]:
            if placed >= len(ting_p2) or page_key not in pages:
                break
            img = Image.open(pages[page_key])
            w, h = img.size
            table_top = int(h * 0.04)
            table_bottom = int(h * 0.97)
            row_h = (table_bottom - table_top) // 4
            img_left = int(w * 0.13)
            img_right = int(w * 0.97)

            rows_this_page = 3 if page_key == 3 else min(3, len(ting_p2) - placed)
            for row_in_page in range(rows_this_page):
                if placed >= len(ting_p2):
                    break
                q = ting_p2[placed]
                row_idx = row_in_page + 1  # +1 跳例题(仅page_003)
                if page_key > 3:
                    row_idx = row_in_page  # 后续页无例题
                top = table_top + row_idx * row_h
                bottom = top + row_h
                item_id = q["id"]
                out_path = OUT_DIR / f"{item_id}.png"
                if crop_and_save(img, (img_left, top, img_right, bottom), out_path):
                    result[item_id] = f"/images/questions/{item_id}.png"
                    print(f"  ✓ {item_id} (听力P2)")
                placed += 1

    # ── 听力 Part3 (section=听力, part=3): 6图共用，page_004 ──
    ting_p3 = groups.get(("听力", 3), [])
    if ting_p3 and 4 in pages:
        img = Image.open(pages[4])
        w, h = img.size
        top = int(h * 0.035)
        bottom = int(h * 0.40)
        left = int(w * 0.03)
        right = int(w * 0.97)

        group_id = f"{paper_id}_p3_group"
        out_path = OUT_DIR / f"{group_id}.png"
        if crop_and_save(img, (left, top, right, bottom), out_path, padding=0):
            for q in ting_p3:
                result[q["id"]] = f"/images/questions/{group_id}.png"
                print(f"  ✓ {q['id']} → {group_id} (听力P3共用)")

    # ── 阅读 Part1 (section=阅读, part=1): 每题1图，page_006 ──
    yue_p1 = groups.get(("阅读", 1), [])
    if yue_p1 and 6 in pages:
        img = Image.open(pages[6])
        w, h = img.size
        # 7行(2例+5题)，图片在左列
        table_top = int(h * 0.16)
        table_bottom = int(h * 0.975)
        row_h = (table_bottom - table_top) // 7
        img_left = int(w * 0.13)
        img_right = int(w * 0.47)

        for i, q in enumerate(yue_p1[:5]):
            row_idx = i + 2
            top = table_top + row_idx * row_h
            bottom = top + row_h
            item_id = q["id"]
            out_path = OUT_DIR / f"{item_id}.png"
            if crop_and_save(img, (img_left, top, img_right, bottom), out_path):
                result[item_id] = f"/images/questions/{item_id}.png"
                print(f"  ✓ {item_id} (阅读P1)")

    # ── 阅读 Part2 (section=阅读, part=2): 5图选项，page_007 ──
    yue_p2 = groups.get(("阅读", 2), [])
    if yue_p2 and 7 in pages:
        img = Image.open(pages[7])
        w, h = img.size
        # 通常上半部分5张图选项(A-E)，下半部分是题目文字
        # 裁整个图组共用
        group_id = f"{paper_id}_r2_group"
        out_path = OUT_DIR / f"{group_id}.png"
        top = int(h * 0.04)
        bottom = int(h * 0.45)
        left = int(w * 0.03)
        right = int(w * 0.97)
        if crop_and_save(img, (left, top, right, bottom), out_path, padding=0):
            for q in yue_p2:
                result[q["id"]] = f"/images/questions/{group_id}.png"
                print(f"  ✓ {q['id']} → {group_id} (阅读P2共用)")

    return result


def main():
    with open(QUESTIONS_JSON, "r", encoding="utf-8") as f:
        questions = json.load(f)

    print(f"共 {len(questions)} 道题目")

    # 按 paper_id 分组
    papers = {}
    for q in questions:
        pid = q["id"].rsplit("_q", 1)[0]
        papers.setdefault(pid, []).append(q)

    EXCLUDE_KEYWORDS = ["答案", "听力", "Loesungen", "听力材料", "听力文本"]
    PREFER_KEYWORDS = ["试卷", "试题", "试题及答案"]

    paper_dir_map = {}
    for d in PAGE_IMG_DIR.iterdir():
        if not d.is_dir():
            continue
        name = d.name
        if any(kw in name for kw in EXCLUDE_KEYWORDS):
            continue
        for pid in papers:
            if pid in name:
                if pid not in paper_dir_map:
                    paper_dir_map[pid] = d
                else:
                    old_name = paper_dir_map[pid].name
                    new_pref = any(kw in name for kw in PREFER_KEYWORDS)
                    old_pref = any(kw in old_name for kw in PREFER_KEYWORDS)
                    if new_pref and not old_pref:
                        paper_dir_map[pid] = d
                break

    print(f"\n找到 {len(paper_dir_map)} 套试卷的页面图片:")
    for pid, d in paper_dir_map.items():
        print(f"  {pid} → {d.name}")

    all_updates = {}
    for pid, d in sorted(paper_dir_map.items()):
        print(f"\n处理 {pid}...")
        updates = process_paper(d, pid, papers.get(pid, []))
        all_updates.update(updates)

    print(f"\n共裁切 {len(all_updates)} 张图片")

    updated = 0
    for q in questions:
        item_id = q["id"]
        if item_id in all_updates:
            q["visualHint"] = all_updates[item_id]
            updated += 1

    with open(QUESTIONS_JSON, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"更新 questions.json: {updated} 道题目获得图片URL")
    print(f"图片保存至: {OUT_DIR}")


if __name__ == "__main__":
    os.chdir(BASE)
    main()
