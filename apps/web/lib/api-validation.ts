import { z } from "zod";

// 业务路由(sessions / admin / mistakes 等)请求体的 zod 校验 schema。
//
// 复用 auth-validation 既有风格(safeParse + firstIssueMessage + safeJson),
// 把此前散落在各路由的裸 `(await req.json()) as {...}` 收敛到这里集中校验,
// 并对枚举字段做运行时取值校验(非法字符串不再能绕过 TS `as` 落库)。
//
// 枚举字面值与 @hsk/shared 的联合类型一一对应;新增取值时两处同步。

// ── 共享枚举 ────────────────────────────────────────────────────────────────

const reviewStatusSchema = z.enum(["pending", "approved", "rejected", "needs_fix"]);
const publishStatusSchema = z.enum(["draft", "ready", "published", "unpublished"]);
const planCodeSchema = z.enum(["free", "pro", "institution"]);
const reviewGradeSchema = z.enum(["again", "hard", "good", "easy"]);
const levelCodeSchema = z.enum([
  "hsk-1",
  "hsk-2",
  "hsk-3",
  "hsk-4",
  "hsk-5",
  "hsk-6",
  "hsk-7",
  "hsk-8",
  "hsk-9",
]);
const sectionCodeSchema = z.enum([
  "listening",
  "reading",
  "writing",
  "speaking",
  "translation",
]);
const setModeSchema = z.enum(["mock_exam", "practice_set"]);

const idSchema = z.string().trim().min(1, "标识不能为空。").max(200, "标识过长。");

// ── sessions ────────────────────────────────────────────────────────────────

// POST /api/sessions
export const createSessionSchema = z.object({
  setIdOrSlug: idSchema,
  mode: setModeSchema,
});

// POST /api/sessions/[id]/answer
export const saveAnswerSchema = z.object({
  itemId: idSchema,
  optionId: z.string().trim().min(1, "缺少 optionId。").max(200, "optionId 过长。"),
});

// ── mistakes ──────────────────────────────────────────────────────────────

// POST /api/mistakes/review
export const reviewMistakeSchema = z.object({
  itemId: idSchema,
  grade: reviewGradeSchema,
});

// ── admin ───────────────────────────────────────────────────────────────────

// PATCH /api/admin/items/[id] — 至少一个字段,且枚举取值合法。
export const patchAdminItemSchema = z
  .object({
    reviewStatus: reviewStatusSchema.optional(),
    publishStatus: publishStatusSchema.optional(),
  })
  .refine((v) => v.reviewStatus !== undefined || v.publishStatus !== undefined, {
    message: "请至少提供 reviewStatus 或 publishStatus。",
  });

// POST /api/admin/publish
export const publishItemSchema = z.object({
  itemId: idSchema,
  publishStatus: publishStatusSchema,
});

// PracticeSet 字段校验。createPracticeSet / patchPracticeSet 共用基础形态。
const practiceSetBaseSchema = z.object({
  slug: z.string().trim().min(1, "缺少 slug。").max(200, "slug 过长。"),
  title: z.string().trim().min(1, "缺少标题。").max(300, "标题过长。"),
  description: z.string().max(2000, "描述过长。"),
  levelCode: levelCodeSchema,
  mode: setModeSchema,
  sectionCode: sectionCodeSchema.optional(),
  access: planCodeSchema,
  minutes: z.number().int().min(0, "时长不能为负。").max(600, "时长过长。"),
  itemIds: z.array(idSchema).max(1000, "题目数量过多。"),
});

// POST /api/admin/sets — 允许带可选 id(由调用方或服务端生成)。
export const createSetSchema = practiceSetBaseSchema.extend({
  id: idSchema.optional(),
});

// PATCH /api/admin/sets/[id] — 局部更新,至少一个字段。
export const patchSetSchema = practiceSetBaseSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "请至少提供一个待更新字段。",
  });

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type ReviewMistakeInput = z.infer<typeof reviewMistakeSchema>;
export type PatchAdminItemInput = z.infer<typeof patchAdminItemSchema>;
export type PublishItemInput = z.infer<typeof publishItemSchema>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
export type PatchSetInput = z.infer<typeof patchSetSchema>;
