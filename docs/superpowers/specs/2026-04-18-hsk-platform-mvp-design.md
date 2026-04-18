# HSK 备考平台 MVP 开发设计文档

**日期**: 2026-04-18  
**状态**: 已批准，待实施  
**方案**: B — Pipeline 优先，数据驱动，两条线并行

---

## 背景与目标

现有 MVP（`hsk-mvp/web`）框架完整，有 45+ 页面和 API，但核心数据层是空的：`mockExamQuestions` 数组硬编码为空，所有题目为 0 道，答题流程无法跑通。

同时存在三个 Web bug 需修复：
1. `/account` 页面白屏
2. 登录状态跨页刷新丢失
3. 未登录用户访问 Free 内容显示"升级后开始"（权限判断错误）

数据来源：30+ 套 HSK1 真题 PDF（扫描图片）+ 对应答案 PDF（纯文字，`pdftotext` 可直接提取）。Pipeline 已产出 494 条题目框架（JSONL），但答案全部缺失。

目标：让用户能在 Web App 上完整跑通「开始模考 → 答题 → 提交 → 查看报告 → 错题本」闭环，使用真实 HSK1 题目数据。音频文件已存在本地，MVP 阶段暂不上传，音频题先显示占位符。

---

## 架构概览

```
答案 PDF (pdftotext)
       ↓
  答案解析脚本 (Python)
       ↓
  答案注入 JSONL (items.jsonl + answers)
       ↓
  CSV 导入脚本 → content_items.csv
       ↓
  Web 导入 API (/api/admin/imports)
       ↓
  hsk-content.ts (从导入文件读取)
```

两条线同时进行：
- **Pipeline 线**：修复答案解析 → 生成完整 JSONL → 导出 CSV
- **Web 线**：修复 3 个 Bug → 改造 hsk-content.ts 支持动态加载

---

## 线一：Pipeline 修复

### 1.1 答案解析脚本

新建 `hsk-mvp/scripts/05b_parse_answers_pdftotext.py`，替代失效的原有 `05_parse_answers.py`。

**输入**：`data/raw/hsk1/` 目录下所有 `*答案.pdf` 文件  
**输出**：`output/answers/` 目录，每份试卷一个 JSON 文件

答案 PDF 文字格式（已验证）：
```
H11555D 卷答案
一、听 力
第一部分
1．√    2．×    3．×    4．×    5．√
9．A    10．A
第二部分
...
二、阅 读
...
```

解析逻辑：
- 用 `subprocess + pdftotext` 提取文字
- 正则匹配题号+答案：`(\d+)[．.]?\s*([√×A-Fa-f])`
- 区分 section（听力/阅读）和 part（第一/二/三/四部分）
- 输出格式：`{"paper_id": "H11555D", "answers": {"1": "√", "2": "×", "9": "A", ...}}`

### 1.2 答案注入脚本

新建 `hsk-mvp/scripts/06b_inject_answers.py`

**输入**：`output/jsonl_v2/items.jsonl` + `output/answers/*.json`  
**输出**：`output/jsonl_v2/items_with_answers.jsonl`

逻辑：通过 `paper_id` + `question_no` 匹配，将答案写入 `answer.value` 字段，更新 `answer.source` 为 `"aligned"`，`answer.confidence` 为 `1.0`。

### 1.3 Web 导入脚本

新建 `hsk-mvp/scripts/10b_export_for_web.py`

**输入**：`output/jsonl_v2/items_with_answers.jsonl`  
**输出**：`output/web_import/questions.json`（Web app 可直接 import 的 TypeScript 兼容格式）

输出格式对齐 `hsk-content.ts` 的 `Question` 类型：
```json
{
  "id": "H11555D_q1",
  "levelId": "hsk-1",
  "section": "听力",
  "part": 1,
  "kind": "image_true_false",
  "prompt": "",
  "options": [],
  "answer": "√",
  "mediaRefs": ["H11555D_p2.png"],
  "reviewStatus": "approved",
  "publishStatus": "published",
  "copyrightStatus": "cleared",
  "sourceType": "re_authored"
}
```

### 1.4 试卷配对策略

部分试卷只有试题 PDF 没有答案 PDF（如 `H11333.pdf` 无对应答案文件），策略：
- 有答案文件 → 正常处理
- 无答案文件 → 跳过，记录到 `output/logs/skipped_papers.json`
- `11224-11227试题及答案.pdf`（答案在同一文件末尾）→ 单独处理，扫描全文找答案页

---

## 线二：Web Bug 修复

### 2.1 Account 页白屏

**文件**：`hsk-mvp/web/app/account/page.tsx`

问题：页面渲染时调用 `getUser()` 但 demo 模式下没有对应实现，导致未处理异常白屏。

修复：在 `getUser()` 返回 null 时显示登录提示或 demo 用户信息，而不是崩溃。

### 2.2 登录状态丢失

**文件**：`hsk-mvp/web/lib/auth.ts` + `hsk-mvp/web/components/site-shell.tsx`

问题：`auth.ts` 的 demo 认证将 session 存在 `localStorage`，但 Server Components 读不到，导致页面刷新后 nav 显示未登录。

修复：将 auth token 同时写入 `document.cookie`（httpOnly 不可行，用普通 cookie），Server Component 通过 `cookies()` 读取用户状态。或将认证态完全移到 Client Component（更简单）。

### 2.3 Free 内容权限判断

**文件**：`hsk-mvp/web/app/practice/mock-exams/[slug]/page.tsx`

问题：未登录用户访问 `access: "free"` 的 Mock A，按钮显示"升级后开始"而不是"开始答题"。

修复：权限判断逻辑改为：
- `access === "free"` → 任何人都可以开始（不需要登录）
- `access === "pro"` + 未登录 → 显示"登录后开始"
- `access === "pro"` + 已登录非 pro → 显示"升级后开始"

### 2.4 hsk-content.ts 动态加载

**文件**：`hsk-mvp/web/lib/hsk-content.ts`

现状：`mockExamQuestions` 是硬编码空数组。

修复：改为从 `output/web_import/questions.json` 导入（构建时静态 import），或通过 API route 动态加载。MVP 阶段用静态 import 最简单：

```typescript
// 从 pipeline 输出导入（构建时）
import questionsData from '../../output/web_import/questions.json'
const allQuestions: Question[] = questionsData
```

如果 `output/web_import/questions.json` 不存在则 fallback 到空数组，不崩溃。

---

## 题型支持

MVP 支持全部 8 种题型，音频题 MVP 阶段显示占位符：

| 题型 | section | 音频 | MVP 处理 |
|------|---------|------|---------|
| `image_true_false` | 听力 Part 1 | 需要 | 显示"🔊 音频加载中"占位符 |
| `image_choice` | 听力 Part 2 | 需要 | 占位符 |
| `dialogue_image_choice` | 听力 Part 3 | 需要 | 占位符 |
| `audio_text_choice` | 听力 Part 4 | 需要 | 占位符 |
| `image_word_judge` | 阅读 Part 1 | 否 | 完整支持 |
| `sentence_image_choice` | 阅读 Part 2 | 否 | 完整支持 |
| `matching` | 阅读 Part 3 | 否 | 完整支持 |
| `fill_blank` | 阅读 Part 4 | 否 | 完整支持 |

---

## 数据流与文件映射

```
hsk-mvp/
├── scripts/
│   ├── 05b_parse_answers_pdftotext.py   [新建]
│   ├── 06b_inject_answers.py             [新建]
│   └── 10b_export_for_web.py             [新建]
├── output/
│   ├── answers/                          [新建目录]
│   │   └── {paper_id}_answers.json
│   ├── jsonl_v2/
│   │   └── items_with_answers.jsonl      [新建]
│   └── web_import/
│       └── questions.json                [新建]
└── web/
    ├── lib/
    │   ├── hsk-content.ts                [修改：动态加载]
    │   └── auth.ts                       [修改：cookie 持久化]
    └── app/
        ├── account/page.tsx              [修改：空值处理]
        └── practice/mock-exams/[slug]/page.tsx  [修改：权限判断]
```

---

## 验收标准

1. `python3 scripts/05b_parse_answers_pdftotext.py` 能成功解析 ≥10 套试卷答案
2. `output/jsonl_v2/items_with_answers.jsonl` 中有答案的题目 ≥ 200 道
3. `output/web_import/questions.json` 包含符合 `Question` 类型的题目数组
4. Web app 登录后刷新页面保持登录状态
5. `/account` 页面不再白屏
6. 未登录用户可以点击"开始答题"进入 Mock A
7. 进入答题后能看到至少一道有内容的题目（阅读题）
8. 提交后能生成报告页面，显示分数
9. 错题本显示本次错误题目

---

## 不在本次范围

- Supabase 数据库连接
- Stripe 支付
- 音频文件上传和播放（占位符即可）
- HSK2-9 内容
- 管理后台功能扩展
- 性能优化
