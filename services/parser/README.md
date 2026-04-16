# Parser Service Contract

`services/parser/` 预留给后续的 PDF / 文档解析服务。

当前阶段：

- 网站只接受结构化 JSON / CSV 导入。
- 不直接在 Web 进程内解析 PDF。
- parser 输出应写入 `content/imports/` 或直接导入数据库。

## 目标职责

1. 将原始 PDF / 图片 / 听力文本解析为结构化题库。
2. 输出标准化的 item / option / answer / set 数据。
3. 生成媒体裁图、音频引用和审核包。
4. 将导入结果送入 review queue，而不是直接暴露给前台。

## 输出约定

- item 必须带 level / section / questionType
- option 与 answer 必须能单独导入
- set 必须显式声明 `mock_exam` 或 `practice_set`
- 所有内容默认进入 `review_status = pending`

## 推荐输出路径

- `services/parser/examples/`
- `content/imports/`
- `content/published/`
