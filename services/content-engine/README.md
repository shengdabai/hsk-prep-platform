# HSK 内容生产引擎 (`@hsk/content-engine`)

按 HSK 蓝图自动组卷 → LLM 出题 → GPT Image 配图 → Minimax TTS 配音 → 产出可入审核队列的结构化题目。

## 用途

这是平台的核心差异化模块。它：
1. 根据 `HSK_3.0_EXAM_SPEC.md` 的 36 种题型规格自动组卷
2. 调 LLM（DeepSeek / OpenAI 兼容）生成专业题目 JSON
3. 对 7 类需图题型调 GPT Image 2 生成配图
4. 对 15 类需音频题型调 Minimax TTS 合成音频
5. 输出 `output/generated-batch.json`（GeneratedItem 数组，含 reviewStatus=pending / publishStatus=draft），供后续导入审核队列

## 快速开始

### Dry-run（无 API Key 也可运行）

```bash
# 从项目根运行
npx tsx services/content-engine/src/cli.ts --level hsk-1 --dry-run

# 只生成特定题型
npx tsx services/content-engine/src/cli.ts \
  --level hsk-2 \
  --types L_SENT_IMG_MC,L_QA_MC3 \
  --count 2 \
  --dry-run
```

dry-run 模式下：
- 不调任何外部 API
- 图片写 `.placeholder.txt` 文件，返回 1x1 data-URI
- 音频写 `.placeholder.txt` 文件
- 产出完整结构的 `generated-batch.json`

### 真实调用（需配置 env）

```bash
# 复制并填写 env
cp ../../.env.example .env.local
# 填写 LLM_API_KEY / OPENAI_API_KEY / MINIMAX_API_KEY / MINIMAX_GROUP_ID

npx tsx services/content-engine/src/cli.ts --level hsk-1
```

## 环境变量

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `LLM_API_KEY` | DeepSeek/OpenAI 兼容密钥（LLM 出题） | — |
| `LLM_BASE_URL` | LLM 端点 | `https://api.deepseek.com` |
| `LLM_MODEL` | LLM 模型名 | `deepseek-chat` |
| `OPENAI_API_KEY` | GPT Image 2 配图 | — |
| `OPENAI_IMAGE_MODEL` | Image 模型名 | `gpt-image-alpha` |
| `OPENAI_IMAGE_SIZE` | 图片尺寸 | `1024x1024` |
| `OPENAI_IMAGE_QUALITY` | 图片质量 | `standard` |
| `MINIMAX_API_KEY` | Minimax TTS | — |
| `MINIMAX_GROUP_ID` | Minimax Group ID（必填） | — |
| `MINIMAX_TTS_MODEL` | TTS 模型 | `speech-02-hd` |

## Adapter 端点 & 请求形状

### LLM (`src/adapters/llm.ts`)
- 端点：`${LLM_BASE_URL}/chat/completions`（默认 `https://api.deepseek.com/chat/completions`）
- 模型：`deepseek-chat`（或任何 OpenAI 兼容模型）
- 请求：`POST` JSON，`{ model, messages: [{role, content}], temperature: 0.7, max_tokens: 4096 }`

### GPT Image 2 (`src/adapters/gpt-image.ts`)
- 端点：`https://api.openai.com/v1/images/generations`
- 模型：`gpt-image-alpha`（gpt-image-2 正式发布后改为 `gpt-image-2`）
- 请求：`{ model, prompt, n:1, size, quality, response_format:"b64_json" }`
- 响应：`{ data: [{ b64_json: "..." }] }` → 解码写 `output/images/<batchId>/<itemId>_<idx>.png`

### Minimax TTS (`src/adapters/minimax.ts`)
- 端点：`https://api.minimax.io/v1/t2a_v2?GroupId=<GROUP_ID>`
- 模型：`speech-02-hd`
- 请求：`{ model, text, stream:false, voice_setting:{voice_id, speed, vol, pitch}, audio_setting:{sample_rate:32000, bitrate:128000, format:"mp3"} }`
- 响应：`{ data: { audio: "<hex string>" } }` → hex decode 写 `output/audio/<batchId>/<itemId>.mp3`

## 题型→媒体映射（HSK_3.0_EXAM_SPEC §7）

### 7 类需图题型
`L_WORD_IMG_TF` `L_SENT_IMG_MC` `L_DIALOG_IMG_MC`
`R_IMG_WORD_TF` `R_SENT_IMG_MC` `W_IMG_WORD_SENT` `W_IMG_WORD_PARA`

### 15 类需音频题型
`L_WORD_IMG_TF` `L_SENT_IMG_MC` `L_DIALOG_IMG_MC` `L_SENT_TF` `L_QA_MC3`
`L_QA_MC4` `L_LONG_MC4` `L_CONSIST_MC4` `L_NEWS_TF` `L_LONG_FILL`
`S_HSKK_REPEAT` `S_HSKK_RETELL` `S_HSKK_QA` `S_OPINION` `T_L2C_INTERPRET`

## 输出结构

```
output/
  generated-batch.json        ← GenerationBatch（主产出，含所有 GeneratedItem）
  images/
    <batchId>/
      <itemId>_0.png          ← 真实调用时的生成图片
      <itemId>_0.placeholder.txt ← dry-run 占位
  audio/
    <batchId>/
      <itemId>.mp3            ← 真实调用时的 TTS 音频
      <itemId>.placeholder.txt ← dry-run 占位
```

## 对接审核队列

`generated-batch.json` 中每条 `GeneratedItem` 已设置：
- `reviewStatus: "pending"`
- `publishStatus: "draft"`

集成层（`apps/web` 或后端服务）从此文件读取，映射到 `packages/shared/src/types.ts` 的 `ImportPayload`，再写入 `content_items` 表并创建 `review_tasks` 记录即可进入现有审核工作流。

## 蓝图覆盖范围

| 级别 | 总题数 | 题型类数 | 状态 |
|------|--------|----------|------|
| HSK 1 | 40 | 8 | 完整 |
| HSK 2 | 60 | 8 | 完整 |
| HSK 3 | 80 | 9 | 完整 |
| HSK 4 | 100 | 8 | 完整 |
| HSK 5 | 100 | 7 | 完整 |
| HSK 6 | 101 | 8 | 完整 |
| HSK 7-9 | 98 | 9 | 占位（部分分部题数 TBD） |
| HSKK 初级 | 27 | 3 | 占位 |
| HSKK 中级 | 14 | 3 | 占位 |
| HSKK 高级 | 6 | 3 | 占位 |
