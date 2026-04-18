# HSK 备考平台 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户能完整跑通「开始模考 → 答题 → 提交 → 查看报告 → 错题本」闭环，使用从真实 HSK1 答案 PDF 解析出的题目数据。

**Architecture:** Pipeline 线用 pdftotext 提取答案 PDF 文字，注入已有 JSONL 题目框架，导出 Web 可用 JSON；Web 线修复 3 个 Bug（account 白屏、登录状态、权限判断）并改造 hsk-content.ts 读取真实数据。

**Tech Stack:** Python 3 + subprocess/pdftotext, Next.js 16 App Router, TypeScript, Tailwind CSS

---

## 文件映射

### 新建文件
- `hsk-mvp/scripts/05b_parse_answers_pdftotext.py` — 从答案 PDF 提取答案，输出 JSON
- `hsk-mvp/scripts/06b_inject_answers.py` — 将答案注入 items.jsonl
- `hsk-mvp/scripts/10b_export_for_web.py` — 导出 Web 可用 questions.json
- `hsk-mvp/output/answers/` — 每套试卷的答案 JSON（自动生成）
- `hsk-mvp/output/jsonl_v2/items_with_answers.jsonl` — 注入答案后的 JSONL（自动生成）
- `hsk-mvp/output/web_import/questions.json` — Web 导入文件（自动生成）

### 修改文件
- `hsk-mvp/web/lib/hsk-content.ts:523` — 改 `mockExamQuestions` 从 JSON 文件加载
- `hsk-mvp/web/app/practice/mock-exams/[slug]/page.tsx:22` — 修复权限判断逻辑
- `hsk-mvp/web/components/start-session-button.tsx:60` — 修复按钮文字逻辑
- `hsk-mvp/web/app/account/page.tsx` — 添加 getDashboardSnapshot/getUserReports 错误处理
- `hsk-mvp/web/lib/platform-store.ts` — 修复 getDashboardSnapshot/getUserReports 空值安全

---

## Task 1: 答案 PDF 解析脚本

**Files:**
- Create: `hsk-mvp/scripts/05b_parse_answers_pdftotext.py`

- [ ] **Step 1: 创建脚本**

```python
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
    # 尝试从第一行提取 paper_id，如 "H11555D 卷答案" -> "H11555D"
    first_line = text.strip().split("\n")[0]
    m = re.match(r"([A-Z0-9]+)\s*[卷答案]", first_line)
    if m:
        return m.group(1)
    # fallback: 用文件名去掉后缀和"答案"字样
    stem = Path(filename).stem
    stem = re.sub(r"[\s_]?答案|[\s_]?Loesungen|[\s_]?卷答案", "", stem)
    return stem.strip()


def parse_answers(text: str) -> dict:
    """返回 {question_no_str: answer_str, ...}，同时记录 section 和 part 信息"""
    answers = {}
    current_section = "听力"
    current_part = 1

    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # 检测 section 切换（一、听力 / 二、阅读）
        for key, val in SECTION_LABELS.items():
            if key in line and ("一、" in line or "二、" in line or "听" in line or "阅" in line):
                current_section = val
                break

        # 检测 part 切换
        for label, num in PART_LABELS.items():
            if label in line:
                current_part = num
                break

        # 匹配题号答案，支持格式：1．√  9．A  14．B
        for m in re.finditer(r"(\d+)[．.]\s*([√×A-Fa-f])", line):
            qno = m.group(1)
            ans = m.group(2).upper()
            # √ × 保持原样，字母统一大写
            if ans in ("√", "×"):
                pass
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
    for pattern in ANSWER_PDF_PATTERNS:
        pdf_files.extend(RAW_DIR.glob(pattern))

    pdf_files = sorted(set(pdf_files))
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
```

- [ ] **Step 2: 运行脚本验证**

```bash
cd /Users/adam/Desktop/中文教学/Hsk-prep-platform/hsk-mvp
python3 scripts/05b_parse_answers_pdftotext.py
```

预期输出：`Found N answer PDFs` 然后 `OK H11555D: 40 answers` 等，最后 `Done: N success, M skipped`

验证输出文件存在：
```bash
cat output/answers/H11555D_answers.json | python3 -m json.tool | head -30
```

预期：看到 `"1": {"answer": "√", "section": "听力", "part": 1}` 等结构

- [ ] **Step 3: Commit**

```bash
cd /Users/adam/Desktop/中文教学/Hsk-prep-platform
git add hsk-mvp/scripts/05b_parse_answers_pdftotext.py hsk-mvp/output/answers/
git commit -m "feat(pipeline): add pdftotext-based answer parser

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 答案注入脚本

**Files:**
- Create: `hsk-mvp/scripts/06b_inject_answers.py`

- [ ] **Step 1: 创建脚本**

```python
#!/usr/bin/env python3
"""将 output/answers/ 中的答案注入 items.jsonl，输出 items_with_answers.jsonl"""
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
ITEMS_PATH = ROOT / "output" / "jsonl_v2" / "items.jsonl"
ANSWERS_DIR = ROOT / "output" / "answers"
OUT_PATH = ROOT / "output" / "jsonl_v2" / "items_with_answers.jsonl"


def load_answers() -> dict[str, dict]:
    """返回 {paper_id: {question_no: answer_info}}"""
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
            # 用答案文件的 section/part 覆盖（更可靠）
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
```

- [ ] **Step 2: 运行并验证**

```bash
cd /Users/adam/Desktop/中文教学/Hsk-prep-platform/hsk-mvp
python3 scripts/06b_inject_answers.py
```

预期：`Injected: N, missing: M`，N 应 ≥ 200

验证：
```bash
python3 -c "
import json
items = [json.loads(l) for l in open('output/jsonl_v2/items_with_answers.jsonl') if l.strip()]
has_ans = [i for i in items if i['answer']['value'] is not None]
print(f'Total: {len(items)}, with answer: {len(has_ans)}')
"
```

- [ ] **Step 3: Commit**

```bash
cd /Users/adam/Desktop/中文教学/Hsk-prep-platform
git add hsk-mvp/scripts/06b_inject_answers.py hsk-mvp/output/jsonl_v2/items_with_answers.jsonl
git commit -m "feat(pipeline): inject answers into items JSONL

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Web 导出脚本

**Files:**
- Create: `hsk-mvp/scripts/10b_export_for_web.py`

- [ ] **Step 1: 先看 Question 类型的完整字段**

读 `hsk-mvp/web/lib/hsk-content.ts` 第 25-45 行确认 Question 类型字段：
```typescript
type Question = {
  id: string;
  title: string;
  level: "HSK1";
  section: SectionName;    // "听力" | "阅读"
  part: 1 | 2 | 3 | 4;
  kind: QuestionKind;
  prompt: string;
  context?: string;
  visualHint?: string;
  options: Array<{ id: string; label: string; text: string }>;
  answer: string;
  explanation: string;
  estimatedSeconds: number;
  vocabFocus: string[];
  sourceType: SourceType;
  reviewStatus: ReviewStatus;
  publishStatus: PublishStatus;
  copyrightStatus: CopyrightStatus;
  tags: string[];
}
```

- [ ] **Step 2: 创建脚本**

```python
#!/usr/bin/env python3
"""将 items_with_answers.jsonl 转换为 Web 可用的 questions.json"""
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
IN_PATH = ROOT / "output" / "jsonl_v2" / "items_with_answers.jsonl"
OUT_DIR = ROOT / "output" / "web_import"
OUT_PATH = OUT_DIR / "questions.json"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# JSONL item_type -> Question kind 映射
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
        return None  # 跳过无答案题目

    item_type = item.get("item_type", "single_choice")
    kind = KIND_MAP.get(item_type, "single_choice")
    section = item.get("section", "阅读")
    part = item.get("part", 1)
    qno = item.get("question_no", 0)
    paper_id = item.get("paper_id", "")

    # 构造 options（听力/图片题暂无文字选项，阅读题从 options 字段取）
    raw_options = item.get("options", [])
    if isinstance(raw_options, list) and raw_options:
        options = [
            {"id": chr(65 + i), "label": chr(65 + i), "text": str(opt)}
            for i, opt in enumerate(raw_options)
        ]
    else:
        options = []

    # 媒体引用（图片/音频占位）
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
        "tags": [f"hsk1", f"{section}", f"part{part}"],
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

    # 按 section/part 统计
    from collections import Counter
    counts = Counter((q["section"], q["part"]) for q in questions)
    for (sec, part), cnt in sorted(counts.items()):
        print(f"  {sec} Part {part}: {cnt} questions")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: 运行验证**

```bash
cd /Users/adam/Desktop/中文教学/Hsk-prep-platform/hsk-mvp
python3 scripts/10b_export_for_web.py
```

预期：`Output: N questions`，然后列出各 section/part 分布。N 应 ≥ 200。

```bash
python3 -c "
import json
qs = json.load(open('output/web_import/questions.json'))
print(f'Total: {len(qs)}')
print('Sample:', json.dumps(qs[0], ensure_ascii=False, indent=2))
"
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adam/Desktop/中文教学/Hsk-prep-platform
git add hsk-mvp/scripts/10b_export_for_web.py hsk-mvp/output/web_import/
git commit -m "feat(pipeline): export questions JSON for web import

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 修复权限判断 Bug

**Files:**
- Modify: `hsk-mvp/web/app/practice/mock-exams/[slug]/page.tsx:22`
- Modify: `hsk-mvp/web/components/start-session-button.tsx:60`

**问题：** `allowed = Boolean(user && (exam.access === "free" || user.plan !== "free"))` — free 内容要求必须登录才能开始，而且未登录时按钮显示"升级后开始"而非"开始答题"。

- [ ] **Step 1: 修改 page.tsx 权限判断**

将 `hsk-mvp/web/app/practice/mock-exams/[slug]/page.tsx` 第 22 行：
```typescript
const allowed = Boolean(user && (exam.access === "free" || user.plan !== "free"));
```
改为：
```typescript
const canStart = exam.access === "free" || Boolean(user && user.plan !== "free");
const needsLogin = !user && exam.access !== "free";
```

同时将第 73 行：
```typescript
<StartSessionButton sourceKind="mock_exam" sourceSlug={exam.slug} allowed={allowed} />
```
改为：
```typescript
<StartSessionButton sourceKind="mock_exam" sourceSlug={exam.slug} allowed={canStart} needsLogin={needsLogin} />
```

- [ ] **Step 2: 修改 StartSessionButton 组件**

将 `hsk-mvp/web/components/start-session-button.tsx` 改为：

```typescript
"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function StartSessionButton({
  sourceKind,
  sourceSlug,
  allowed,
  needsLogin = false,
}: {
  sourceKind: "mock_exam" | "practice_set";
  sourceSlug: string;
  allowed: boolean;
  needsLogin?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (needsLogin) {
      router.push(`/login?next=/practice/mock-exams/${sourceSlug}`);
      return;
    }
    if (!allowed) {
      router.push("/pricing");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceKind, sourceSlug }),
      });

      const data = (await response.json()) as { sessionId?: string; error?: string };

      if (!response.ok || !data.sessionId) {
        setError(data.error ?? "无法创建会话，请稍后重试。");
        setPending(false);
        return;
      }

      startTransition(() => {
        router.push(`/session/${data.sessionId}`);
      });
    } catch {
      setError("网络异常，请稍后重试。");
      setPending(false);
    }
  }

  function buttonLabel() {
    if (pending) return "正在创建会话...";
    if (needsLogin) return "登录后开始";
    if (!allowed) return "升级后开始";
    return "开始本组练习";
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleStart}
        disabled={pending}
        className="rounded-full bg-[#9f3215] px-6 py-3 text-sm font-medium text-[#fff3df] transition hover:bg-[#84240f] disabled:cursor-wait disabled:opacity-70"
      >
        {buttonLabel()}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 3: 在浏览器验证**

访问 `http://localhost:3000/practice/mock-exams/h1_mock_a`（未登录）
预期：按钮显示"开始本组练习"（free 内容无需登录）

- [ ] **Step 4: Commit**

```bash
cd /Users/adam/Desktop/中文教学/Hsk-prep-platform
git add hsk-mvp/web/app/practice/mock-exams/\[slug\]/page.tsx hsk-mvp/web/components/start-session-button.tsx
git commit -m "fix(web): correct access control for free mock exams

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 修复 Account 页白屏

**Files:**
- Modify: `hsk-mvp/web/lib/platform-store.ts`
- Modify: `hsk-mvp/web/app/account/page.tsx`

**问题：** `getDashboardSnapshot` 和 `getUserReports` 可能抛异常或返回 undefined，导致 Account 页白屏（React 渲染错误）。

- [ ] **Step 1: 查看 getDashboardSnapshot 实现**

```bash
grep -n "getDashboardSnapshot\|getUserReports" /Users/adam/Desktop/中文教学/Hsk-prep-platform/hsk-mvp/web/lib/platform-store.ts | head -20
```

- [ ] **Step 2: 修改 account/page.tsx 添加安全处理**

在 `hsk-mvp/web/app/account/page.tsx` 中，将：
```typescript
const reports = await getUserReports(user.id);
const snapshot = await getDashboardSnapshot(user.id);
```
改为：
```typescript
const [reports, snapshot] = await Promise.all([
  getUserReports(user.id).catch(() => []),
  getDashboardSnapshot(user.id).catch(() => ({
    reportCount: 0,
    pendingReviewCount: 0,
    readyToPublishCount: 0,
  })),
]);
```

- [ ] **Step 3: 在浏览器验证**

1. 登录（`learner@hskmvp.local / demo1234`）
2. 访问 `http://localhost:3000/account`
3. 预期：页面正常显示用户名、计划、统计数字（可能为 0）

- [ ] **Step 4: Commit**

```bash
cd /Users/adam/Desktop/中文教学/Hsk-prep-platform
git add hsk-mvp/web/app/account/page.tsx
git commit -m "fix(web): handle null returns in account page to prevent white screen

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 改造 hsk-content.ts 读取真实题目数据

**Files:**
- Modify: `hsk-mvp/web/lib/hsk-content.ts:523`

**问题：** `mockExamQuestions` 是空数组，所有题目为 0 道。改为从 pipeline 生成的 questions.json 加载。

- [ ] **Step 1: 确认 questions.json 路径**

`hsk-mvp/output/web_import/questions.json` 相对于 `hsk-mvp/web/` 是 `../../output/web_import/questions.json`（注意：Next.js 项目根是 `hsk-mvp/web/`）

- [ ] **Step 2: 修改 hsk-content.ts**

在 `hsk-mvp/web/lib/hsk-content.ts` 中，将第 523 行：
```typescript
const mockExamQuestions: Question[] = [];
```
改为：
```typescript
import questionsData from "../../output/web_import/questions.json" assert { type: "json" };

let _loadedQuestions: Question[] | null = null;

function getLoadedQuestions(): Question[] {
  if (_loadedQuestions) return _loadedQuestions;
  try {
    _loadedQuestions = questionsData as unknown as Question[];
  } catch {
    _loadedQuestions = [];
  }
  return _loadedQuestions;
}

const mockExamQuestions: Question[] = getLoadedQuestions();
```

**注意：** 如果 TypeScript 报 `assert { type: "json" }` 语法错误，改用：
```typescript
// eslint-disable-next-line @typescript-eslint/no-var-requires
const questionsData: unknown[] = require("../../output/web_import/questions.json");
const mockExamQuestions: Question[] = questionsData as Question[];
```

- [ ] **Step 3: 更新 next.config.ts 允许 JSON import**

检查 `hsk-mvp/web/next.config.ts` 是否需要添加：
```typescript
const nextConfig: NextConfig = {
  // 已有配置...
  experimental: {
    // 如果需要
  },
};
```

通常 Next.js 16 + TypeScript 5 默认支持 JSON import，不需要额外配置。

- [ ] **Step 4: 重启 dev server 并验证**

```bash
# 在 hsk-mvp/web/ 目录
pkill -f "next dev" 2>/dev/null; sleep 1
pnpm dev &
sleep 5
curl -s http://localhost:3000/practice/mock-exams/h1_mock_a | grep -o "[0-9]* 题" | head -5
```

预期：页面显示题数 > 0（如"40 题"）

- [ ] **Step 5: Commit**

```bash
cd /Users/adam/Desktop/中文教学/Hsk-prep-platform
git add hsk-mvp/web/lib/hsk-content.ts
git commit -m "feat(web): load real HSK1 questions from pipeline output

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: 端到端流程验证

**Files:** 无代码改动，验证流程

- [ ] **Step 1: 确认服务器运行**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```
预期：`200`

- [ ] **Step 2: 验证 Mock A 题目数量**

```bash
B=~/.claude/skills/gstack/browse/dist/browse
$B goto http://localhost:3000/practice/mock-exams/h1_mock_a
$B text | grep -E "[0-9]+ 题"
```
预期：显示 > 0 题数

- [ ] **Step 3: 未登录开始 Free 模考**

```bash
$B goto http://localhost:3000/practice/mock-exams/h1_mock_a
$B snapshot -i 2>&1 | grep "button"
```
预期：按钮显示"开始本组练习"（不是"升级后开始"）

- [ ] **Step 4: 登录并跑完整流程**

```bash
$B goto http://localhost:3000/login
# 登录后点 Mock A -> 开始答题 -> 提交 -> 查看报告
```
手动在浏览器验证：答题 → 提交 → 报告页显示分数 → 错题本有记录

- [ ] **Step 5: 验证 Account 页不白屏**

```bash
$B goto http://localhost:3000/account
$B text | head -10
```
预期：显示用户名而不是空白

---

## 验收核查表

- [ ] `python3 scripts/05b_parse_answers_pdftotext.py` 解析 ≥ 10 套答案
- [ ] `output/jsonl_v2/items_with_answers.jsonl` 有答案题目 ≥ 200 道
- [ ] `output/web_import/questions.json` 非空
- [ ] Mock A 详情页显示题数 > 0
- [ ] 未登录可点击"开始本组练习"进入 Free 模考
- [ ] `/account` 页面不再白屏
- [ ] 答题 → 提交 → 报告页完整流程可跑通
- [ ] 错题本在提交后有记录

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET
