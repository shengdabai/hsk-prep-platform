# HSK 自动题库生产流水线（优化后)

> 分工:**文本=authoring(人/Claude 编写 spec)｜配图=Codex 内置出图｜配音=Minimax TTS**
> 目标:按 HSK 蓝图自动组卷,产出带图/音的题目 → 平台审核队列/已发布,可直接做题。

## 一、流水线四步(均可独立重跑,中断可恢复)

```
spec(banks/*.spec.json)               ← 第1步 authoring:写题目内容 + imageBrief + audioScript
  │
  ├─(图)Codex 出图 → apps/web/public/generated/images/<level>/<itemId>.png   ← 第2步
  ├─(音)tts-run → Minimax → apps/web/public/generated/audio/<level>/<itemId>.mp3 ← 第3步
  │
  └─ build-bank → content/published/<slug>.generated.json                    ← 第4步组装
                   (按实际存在的媒体回填 imageUrl/audioUrl)
        │
        └─ 平台 mock-repository 自动 seed content/published/*.generated.json → demo 直接可见
           (Supabase:用 apps/web/scripts/import-items.ts 导入)
```

**幂等性**:每步只依赖磁盘产物,缺媒体的题在 build-bank 里只是不带 url;补齐媒体后重跑 build-bank 即生效。整批不会因单题缺失而失败。

## 二、命令

```bash
# 第2步:配图(Codex)——由编排者(Claude)对每个 imageBrief 调 Codex MCP,
#        直接落盘到 apps/web/public/generated/images/<level>/<itemId>.png

# 第3步:配音(Minimax,需 apps/web/.env.local 配 MINIMAX_API_KEY + MINIMAX_GROUP_ID)
cd services/content-engine
../../apps/web/node_modules/.bin/tsx src/tts-run.ts banks/<spec>.spec.json

# 第4步:组装 → content/published/<slug>.generated.json
../../apps/web/node_modules/.bin/tsx src/build-bank.ts banks/<spec>.spec.json
```

## 三、spec 格式(banks/*.spec.json)

见 `banks/hsk1-ce-pilot.spec.json`。每题:
- `id` / `questionTypeCode`(HSK 3.0 题型代码)/ `sectionCode` / `title` / `stem` / `prompt`
- `options` + `correctOptionId`(客观题)/ `answerText`(排序正确序列/书写参考)
- `explanation` / `vocabFocus` / `tags`
- `imageBrief`(英文,给 Codex 出图;无则不配图)
- `audioScript`(中文,给 Minimax 配音;无则不配音)
- `context`(听力原文,提交后展示)

判分:平台按 `QUESTION_TYPE_META[questionTypeCode].answerFormat` 自动分流
(judge/mc/fill=选项相等,order=序列,书写/口语=ungraded 待人工)。

## 四、扩量到全 HSK1 及 HSK2-6

1. 按 `src/blueprint.ts` 各级蓝图 authoring 出完整 spec(HSK1=40题/8型)。
2. 对每个 `imageBrief` 调 Codex 出图(看图选择题需多张选项图,命名 `<itemId>_<optIdx>.png`,
   build-bank 后续支持选项级图;当前 pilot 用单图/词图)。
3. tts-run 跑全部 `audioScript`。
4. build-bank 组装 → 平台可见。

## 五、媒体服务

图/音放 `apps/web/public/generated/` 下,Next 直接以 `/generated/...` 静态服务,
imageUrl/audioUrl 即该路径。做题页(question-view + audio-player)按题型渲染图、播放音频。

## 六、安全 / 成本

- 所有 key 仅从 `apps/web/.env.local` 经 `process.loadEnvFile` 运行期加载,不入代码/日志。
- Minimax 无 key 时 tts-run 产占位、不真调、不计费。
- Codex 出图走会话内置图像工具,无需 OpenAI key。
- 大批量前先小批 pilot 验证(本仓库已含 `hsk1-ce-pilot`)。
