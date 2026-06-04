import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeReportDimensions,
  gradeResponse,
  hasPaidAccess,
  initialSrsState,
  isAutoGradable,
  isMistakeDue,
  levels as staticLevels,
  scheduleSrs,
  type AdminListItem,
  type AppUser,
  type ContentItem,
  type ExamReport,
  type ExamSession,
  type GradingStrategy,
  type LevelCode,
  type LevelSummary,
  type MistakeEntry,
  type PlanCode,
  type PracticeSet,
  type PublishStatus,
  type QuestionOption,
  type QuestionTypeCode,
  type ReviewGrade,
  type ReviewStatus,
  type SectionCode,
  type SourceType,
  type Subscription,
  type SubscriptionStatus,
  type UserRole,
} from "@hsk/shared";

import { createSupabaseAdminClient } from "./supabase";
import type {
  ContentItemAnswerRow,
  ContentItemOptionRow,
  ContentItemRow,
  ExamReportRow,
  ExamSessionRow,
  MistakeBookRow,
  PracticeSetRow,
  ProfileRow,
} from "./schema";
import type { Repository } from "./types";

// --- 客户端获取(惰性,避免模块加载即抛) --------------------------------------
// service-role 客户端用于服务端数据访问,绕过 RLS;调用方已确保仅在服务端使用。
// 用未带 Database 泛型的 SupabaseClient:db/src/types.ts 的 Database 类型只覆盖了
// 部分表且 Row 是领域类型(非 snake_case Row),套用会让 .from("plans") 等失败。
// 这里把 .from() 当作弱类型查询入口,所有结果通过本文件的 Row 类型显式收窄。
type AdminClient = SupabaseClient;

let cachedAdmin: AdminClient | null = null;
function admin(): AdminClient {
  if (!cachedAdmin) {
    cachedAdmin = createSupabaseAdminClient() as unknown as AdminClient;
  }
  return cachedAdmin;
}

// --- 错误处理:DB 真错误 throw,缺数据返回 null/[] -----------------------------
function fail(context: string, error: { message?: string } | null): never {
  throw new Error(`Supabase repository error in ${context}: ${error?.message ?? "unknown error"}`);
}

// --- 枚举收窄:DB 文本列 → 领域 union 类型 ------------------------------------
// 小而封闭的枚举做有效性校验回退;levelCode/sectionCode/questionTypeCode 是
// HSK 3.0 宽 union(几十个 code,DB 维度表是权威来源),直接断言不做硬编码白名单,
// 避免与 @hsk/shared 的 spec 题型代码漂移。
function asReviewStatus(value: string): ReviewStatus {
  const allowed: readonly ReviewStatus[] = ["pending", "approved", "rejected", "needs_fix"];
  return allowed.includes(value as ReviewStatus) ? (value as ReviewStatus) : "pending";
}

function asPublishStatus(value: string): PublishStatus {
  const allowed: readonly PublishStatus[] = ["draft", "ready", "published", "unpublished"];
  return allowed.includes(value as PublishStatus) ? (value as PublishStatus) : "draft";
}

function asSourceType(value: string): SourceType {
  const allowed: readonly SourceType[] = ["reference_only", "re_authored", "original"];
  return allowed.includes(value as SourceType) ? (value as SourceType) : "original";
}

function asLevelCode(value: string): LevelCode {
  // DB levels.code 即权威等级代码(hsk-1 … hsk-9)。
  return value as LevelCode;
}

function asSectionCode(value: string): SectionCode {
  // DB sections.code 即权威技能代码(listening/reading/writing/speaking/translation)。
  return value as SectionCode;
}

function asQuestionTypeCode(value: string): QuestionTypeCode {
  // DB question_types.code 即权威题型代码(HSK 3.0 spec 第六节)。
  return value as QuestionTypeCode;
}

function asPlanCode(value: string | null | undefined): PlanCode {
  return value === "pro" || value === "institution" ? value : "free";
}

function asUserRole(value: string): UserRole {
  return value === "admin" || value === "reviewer" || value === "learner" ? value : "anonymous";
}

function asSubscriptionStatus(value: string): SubscriptionStatus {
  return value === "active" || value === "inactive" || value === "past_due" || value === "canceled"
    ? value
    : "inactive";
}

function asGradingStrategy(value: string | null | undefined): GradingStrategy {
  const allowed: readonly GradingStrategy[] = [
    "single_choice",
    "judge",
    "match",
    "order",
    "manual",
    "auto_text",
  ];
  return value && allowed.includes(value as GradingStrategy)
    ? (value as GradingStrategy)
    : "single_choice";
}

// media_assets(storage_bucket + storage_path)→ 可播放/可显示的公开 URL。
// 用 Supabase Storage 的公开 URL 规则(getPublicUrl 仅做字符串拼接,无网络调用)。
function mediaPublicUrl(asset: MediaAssetLite | null | undefined): string | undefined {
  if (!asset) {
    return undefined;
  }
  const { data } = admin().storage.from(asset.storage_bucket).getPublicUrl(asset.storage_path);
  return data?.publicUrl || undefined;
}

// --- code lookup 缓存(level / section / question_type 的 code ↔ id 映射) ------
// 这些是低频变动的维度表,首次查询后缓存,避免每个 content_item 都 join。
type LookupMaps = {
  levelCodeById: Map<string, string>;
  sectionCodeById: Map<string, string>;
  questionTypeCodeById: Map<string, string>;
};

let cachedLookups: LookupMaps | null = null;

async function getLookups(): Promise<LookupMaps> {
  if (cachedLookups) {
    return cachedLookups;
  }
  const client = admin();
  const [levelsRes, sectionsRes, qtRes] = await Promise.all([
    client.from("levels").select("id, code"),
    client.from("sections").select("id, code"),
    client.from("question_types").select("id, code"),
  ]);
  if (levelsRes.error) fail("getLookups(levels)", levelsRes.error);
  if (sectionsRes.error) fail("getLookups(sections)", sectionsRes.error);
  if (qtRes.error) fail("getLookups(question_types)", qtRes.error);

  const levelCodeById = new Map<string, string>();
  for (const row of (levelsRes.data ?? []) as Array<{ id: string; code: string }>) {
    levelCodeById.set(row.id, row.code);
  }
  const sectionCodeById = new Map<string, string>();
  for (const row of (sectionsRes.data ?? []) as Array<{ id: string; code: string }>) {
    sectionCodeById.set(row.id, row.code);
  }
  const questionTypeCodeById = new Map<string, string>();
  for (const row of (qtRes.data ?? []) as Array<{ id: string; code: string }>) {
    questionTypeCodeById.set(row.id, row.code);
  }
  cachedLookups = { levelCodeById, sectionCodeById, questionTypeCodeById };
  return cachedLookups;
}

// --- plans code ↔ id 映射 -----------------------------------------------------
async function getPlanIdByCode(code: PlanCode): Promise<string | null> {
  const client = admin();
  const { data, error } = await client.from("plans").select("id").eq("code", code).maybeSingle();
  if (error) fail("getPlanIdByCode", error);
  return (data as { id: string } | null)?.id ?? null;
}

async function getPlanCodeById(planId: string): Promise<PlanCode> {
  const client = admin();
  const { data, error } = await client.from("plans").select("code").eq("id", planId).maybeSingle();
  if (error) fail("getPlanCodeById", error);
  return asPlanCode((data as { code: string } | null)?.code);
}

// --- row → domain mappers -----------------------------------------------------
function mapProfileToUser(row: ProfileRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? "",
    role: asUserRole(row.role),
    plan: asPlanCode(row.default_plan_code),
  };
}

// media_assets 嵌套子集(仅取拼 URL 所需列)。
type MediaAssetLite = { storage_bucket: string; storage_path: string };

// content_items 需要 options + answer + 媒体资产 才能构成完整 ContentItem。
// 此 query shape 用嵌套 select 拉一次取齐(含 image/audio 资产的双向 FK 内联)。
type ContentItemJoined = ContentItemRow & {
  content_item_options: ContentItemOptionRow[] | null;
  content_item_answers: ContentItemAnswerRow[] | null;
  content_item_tags:
    | Array<{ tags: { code: string } | { code: string }[] | null }>
    | null;
  // PostgREST 对同一目标表的两个 FK 需用显式约束名消歧,内联为单对象(或数组,做兼容)。
  image_asset: MediaAssetLite | MediaAssetLite[] | null;
  audio_asset: MediaAssetLite | MediaAssetLite[] | null;
};

const CONTENT_ITEM_SELECT =
  "*, content_item_options(*), content_item_answers(*), content_item_tags(tags(code)), " +
  "image_asset:media_assets!content_items_image_asset_id_fkey(storage_bucket, storage_path), " +
  "audio_asset:media_assets!content_items_audio_asset_id_fkey(storage_bucket, storage_path)";

function firstEmbedded<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapContentItem(row: ContentItemJoined, lookups: LookupMaps): ContentItem {
  const options = [...(row.content_item_options ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  // 领域 option.id 用 option_key(与 mock 一致:correctOptionId / 前端提交的 optionId
  // 都是 'A'/'B'/...),DB 的 UUID 仅在持久化答案时内部使用。
  const domainOptions: QuestionOption[] = options.map((opt) => ({
    id: opt.option_key,
    label: opt.option_key,
    text: opt.option_text,
  }));

  // 正确答案:answer 行的 correct_option_id 是 option 的 UUID,映射回 option_key。
  const answer = (row.content_item_answers ?? [])[0] ?? null;
  let correctOptionId = "";
  if (answer?.correct_option_id) {
    const matched = options.find((opt) => opt.id === answer.correct_option_id);
    correctOptionId = matched?.option_key ?? "";
  }

  const tags = (row.content_item_tags ?? [])
    .map((rel) => {
      const t = rel.tags;
      if (!t) return null;
      const tag = Array.isArray(t) ? t[0] : t;
      return tag?.code ?? null;
    })
    .filter((code): code is string => Boolean(code));

  // 主观题/排序/无选项填空的参考答案与阅卷策略(来自 content_item_answers)。
  // answer_text 对 order(正确序列)、fill 文本题、书写/口语参考答案是判分必需字段,
  // 之前被丢弃会导致这些题型从 Supabase 读出后必然错判(见 @hsk/shared/grading.ts)。
  const answerText = answer?.answer_text ?? null;
  const gradingStrategy = asGradingStrategy(answer?.grading_strategy);

  // 媒体直链:image_asset_id / audio_asset_id → media_assets → 公开 URL。
  const imageUrl = mediaPublicUrl(firstEmbedded(row.image_asset));
  const audioUrl = mediaPublicUrl(firstEmbedded(row.audio_asset));

  return {
    id: row.id,
    levelCode: asLevelCode(lookups.levelCodeById.get(row.level_id) ?? "hsk-1"),
    sectionCode: asSectionCode(lookups.sectionCodeById.get(row.section_id) ?? "listening"),
    questionTypeCode: asQuestionTypeCode(
      lookups.questionTypeCodeById.get(row.question_type_id) ?? "single_choice",
    ),
    title: row.title,
    stem: row.stem ?? "",
    prompt: row.prompt,
    explanation: row.explanation ?? "",
    reviewStatus: asReviewStatus(row.review_status),
    publishStatus: asPublishStatus(row.publish_status),
    sourceType: asSourceType(row.source_type),
    copyrightCleared: row.copyright_status === "cleared",
    options: domainOptions,
    correctOptionId,
    tags,
    // ---- HSK 3.0 全科媒体 / 主观题字段(全部 optional;无数据时省略键)----
    ...(row.image_asset_id ? { imageAssetId: row.image_asset_id } : {}),
    ...(row.audio_asset_id ? { audioAssetId: row.audio_asset_id } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(audioUrl ? { audioUrl } : {}),
    // 主观题参考答案文本(order/书写/口语):null 时省略键,保持与领域类型 optional 对齐。
    ...(answerText != null ? { answerText } : {}),
    gradingStrategy,
  };
}

function mapPracticeSet(row: PracticeSetRow, itemIds: string[], lookups: LookupMaps): PracticeSet {
  const sectionCode = row.section_id
    ? asSectionCode(lookups.sectionCodeById.get(row.section_id) ?? "listening")
    : undefined;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    levelCode: asLevelCode(lookups.levelCodeById.get(row.level_id) ?? "hsk-1"),
    mode: row.set_mode,
    ...(sectionCode ? { sectionCode } : {}),
    access: asPlanCode(row.access_plan_code),
    minutes: row.duration_minutes,
    itemIds,
  };
}

function mapMistake(row: MistakeBookRow, item: ContentItem | null, setSlug: string): MistakeEntry {
  return {
    id: row.id,
    userId: row.profile_id,
    itemId: row.content_item_id,
    setSlug,
    levelCode: item?.levelCode ?? "hsk-1",
    sectionCode: item?.sectionCode ?? "listening",
    mastered: row.mastered,
    createdAt: row.created_at,
    // SRS 列(004 之后存在);旧库缺列时保持 undefined,不破坏领域类型(全 optional)。
    ...(row.ease_factor != null ? { easeFactor: row.ease_factor } : {}),
    ...(row.interval_days != null ? { intervalDays: row.interval_days } : {}),
    ...(row.repetitions != null ? { repetitions: row.repetitions } : {}),
    ...(row.due_at != null ? { dueAt: row.due_at } : {}),
    ...(row.last_reviewed_at != null ? { lastReviewedAt: row.last_reviewed_at } : {}),
  };
}

// --- practice set 解析(idOrSlug) --------------------------------------------
async function resolvePracticeSetRow(idOrSlug: string): Promise<PracticeSetRow | null> {
  const client = admin();
  // 优先按 slug,再按 id;两者都可能命中。
  const bySlug = await client
    .from("practice_sets")
    .select("*")
    .eq("slug", idOrSlug)
    .maybeSingle();
  if (bySlug.error && bySlug.error.code !== "PGRST116") fail("resolvePracticeSetRow(slug)", bySlug.error);
  if (bySlug.data) {
    return bySlug.data as PracticeSetRow;
  }
  // slug 未命中时再按 id(id 是 uuid,非 uuid 字符串查询会报错,故 catch)。
  const byId = await client.from("practice_sets").select("*").eq("id", idOrSlug).maybeSingle();
  if (byId.error && byId.error.code !== "PGRST116" && byId.error.code !== "22P02") {
    fail("resolvePracticeSetRow(id)", byId.error);
  }
  return (byId.data as PracticeSetRow | null) ?? null;
}

async function getSetItemIds(practiceSetId: string): Promise<string[]> {
  const client = admin();
  const { data, error } = await client
    .from("practice_set_items")
    .select("content_item_id, display_order")
    .eq("practice_set_id", practiceSetId)
    .order("display_order", { ascending: true });
  if (error) fail("getSetItemIds", error);
  return ((data ?? []) as Array<{ content_item_id: string }>).map((r) => r.content_item_id);
}

// 取一组 content_items(含 options/answers/tags),并保持给定 id 顺序。
async function fetchContentItems(ids: string[]): Promise<Map<string, ContentItem>> {
  const map = new Map<string, ContentItem>();
  if (ids.length === 0) {
    return map;
  }
  const client = admin();
  const lookups = await getLookups();
  const { data, error } = await client
    .from("content_items")
    .select(CONTENT_ITEM_SELECT)
    .in("id", ids);
  if (error) fail("fetchContentItems", error);
  for (const row of (data ?? []) as unknown as ContentItemJoined[]) {
    map.set(row.id, mapContentItem(row, lookups));
  }
  return map;
}

// 计分(对齐 mock):仅就 published 题集计分,answers 键为 itemId、值为 option key。
function scoreSection(
  items: ContentItem[],
  answers: Record<string, string>,
  sectionCode: SectionCode,
) {
  const relevant = items.filter((item) => item.sectionCode === sectionCode);
  const correct = relevant.filter((item) => gradeResponse(item, answers[item.id]) === "correct").length;
  // total 只算可自动判分的题(主观书写/口语不计入分母),与 mock 一致。
  const total = relevant.filter((item) => isAutoGradable(item)).length;
  return { sectionCode, correct, total };
}

// --- ExamSession row → domain(answers 需从 exam_responses 重建) ----------------
async function buildSessionDomain(row: ExamSessionRow): Promise<ExamSession> {
  const client = admin();
  const setRes = await client
    .from("practice_sets")
    .select("slug, set_mode")
    .eq("id", row.practice_set_id)
    .maybeSingle();
  if (setRes.error) fail("buildSessionDomain(set)", setRes.error);
  const set = setRes.data as { slug: string; set_mode: "mock_exam" | "practice_set" } | null;

  // 重建 answers:itemId → option_key(选项题)或 answer_text(排序/书写等非选项题)。
  const respRes = await client
    .from("exam_responses")
    .select("content_item_id, selected_option_id, answer_text")
    .eq("exam_session_id", row.id);
  if (respRes.error) fail("buildSessionDomain(responses)", respRes.error);
  const responses = (respRes.data ?? []) as Array<{
    content_item_id: string;
    selected_option_id: string | null;
    answer_text: string | null;
  }>;

  const answers: Record<string, string> = {};
  const optionUuids = responses
    .map((r) => r.selected_option_id)
    .filter((id): id is string => Boolean(id));
  let keyByUuid = new Map<string, string>();
  if (optionUuids.length > 0) {
    const optRes = await client
      .from("content_item_options")
      .select("id, option_key")
      .in("id", optionUuids);
    if (optRes.error) fail("buildSessionDomain(options)", optRes.error);
    keyByUuid = new Map(
      ((optRes.data ?? []) as Array<{ id: string; option_key: string }>).map((o) => [
        o.id,
        o.option_key,
      ]),
    );
  }
  for (const r of responses) {
    if (r.selected_option_id) {
      const key = keyByUuid.get(r.selected_option_id);
      if (key) {
        answers[r.content_item_id] = key;
      }
    } else if (r.answer_text != null && r.answer_text !== "") {
      // 非选项作答(排序序列 / 书写文本):原样回填,供 gradeResponse 按题型判分。
      answers[r.content_item_id] = r.answer_text;
    }
  }

  return {
    id: row.id,
    userId: row.profile_id,
    setId: row.practice_set_id,
    setSlug: set?.slug ?? "",
    mode: set?.set_mode ?? "practice_set",
    status: row.status === "submitted" ? "submitted" : "active",
    startedAt: row.started_at,
    ...(row.submitted_at ? { submittedAt: row.submitted_at } : {}),
    answers,
  };
}

// --- published 题集过滤(对齐 mock) ------------------------------------------
function isPublishedItem(item: ContentItem): boolean {
  return (
    item.reviewStatus === "approved" &&
    item.publishStatus === "published" &&
    item.copyrightCleared &&
    item.sourceType !== "reference_only"
  );
}

// --- 内部:取某套卷的 published 题(保持 display_order) -------------------------
async function getPublishedItems(setIdOrSlug: string): Promise<ContentItem[]> {
  const set = await resolvePracticeSetRow(setIdOrSlug);
  if (!set) {
    return [];
  }
  const ids = await getSetItemIds(set.id);
  const itemMap = await fetchContentItems(ids);
  return ids
    .map((id) => itemMap.get(id))
    .filter((item): item is ContentItem => Boolean(item))
    .filter(isPublishedItem);
}

export const supabaseRepository: Repository = {
  async getLevels(): Promise<LevelSummary[]> {
    // 等级概览是静态的产品维度(含 coming_soon),与 mock 保持一致返回常量,
    // 而非按 DB levels 表(后者只 seed 了 hsk-1)。
    return staticLevels;
  },

  async getMockExams(): Promise<PracticeSet[]> {
    const client = admin();
    const lookups = await getLookups();
    const { data, error } = await client
      .from("practice_sets")
      .select("*")
      .eq("set_mode", "mock_exam")
      .order("created_at", { ascending: true });
    if (error) fail("getMockExams", error);
    const rows = (data ?? []) as PracticeSetRow[];
    const result: PracticeSet[] = [];
    for (const row of rows) {
      const ids = await getSetItemIds(row.id);
      result.push(mapPracticeSet(row, ids, lookups));
    }
    return result;
  },

  async getMockExamById(idOrSlug: string): Promise<PracticeSet | null> {
    const row = await resolvePracticeSetRow(idOrSlug);
    if (!row || row.set_mode !== "mock_exam") {
      return null;
    }
    const lookups = await getLookups();
    const ids = await getSetItemIds(row.id);
    return mapPracticeSet(row, ids, lookups);
  },

  async getPracticeSets(): Promise<PracticeSet[]> {
    const client = admin();
    const lookups = await getLookups();
    const { data, error } = await client
      .from("practice_sets")
      .select("*")
      .eq("set_mode", "practice_set")
      .order("created_at", { ascending: true });
    if (error) fail("getPracticeSets", error);
    const rows = (data ?? []) as PracticeSetRow[];
    const result: PracticeSet[] = [];
    for (const row of rows) {
      const ids = await getSetItemIds(row.id);
      result.push(mapPracticeSet(row, ids, lookups));
    }
    return result;
  },

  async getPracticeSetById(idOrSlug: string): Promise<PracticeSet | null> {
    const row = await resolvePracticeSetRow(idOrSlug);
    if (!row || row.set_mode !== "practice_set") {
      return null;
    }
    const lookups = await getLookups();
    const ids = await getSetItemIds(row.id);
    return mapPracticeSet(row, ids, lookups);
  },

  async getPublishedItemsForSet(setIdOrSlug: string): Promise<ContentItem[]> {
    return getPublishedItems(setIdOrSlug);
  },

  async createSession({ userId, setIdOrSlug, mode }) {
    const set = await resolvePracticeSetRow(setIdOrSlug);
    if (!set) {
      throw new Error("Set not found");
    }
    const client = admin();
    const { data, error } = await client
      .from("exam_sessions")
      .insert({ profile_id: userId, practice_set_id: set.id, status: "active" })
      .select("*")
      .single();
    if (error || !data) fail("createSession", error);
    return buildSessionDomain(data as ExamSessionRow);
  },

  async getSession(sessionId: string): Promise<ExamSession | null> {
    const client = admin();
    const { data, error } = await client
      .from("exam_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (error && error.code !== "22P02") fail("getSession", error);
    if (!data) {
      return null;
    }
    return buildSessionDomain(data as ExamSessionRow);
  },

  async saveAnswer({ sessionId, itemId, optionId }) {
    const client = admin();
    const sessionRes = await client
      .from("exam_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionRes.error && sessionRes.error.code !== "22P02") fail("saveAnswer(session)", sessionRes.error);
    if (!sessionRes.data) {
      return null;
    }

    // 前端提交的 optionId 是 option_key('A'/'B'/...),解析为该题的 option UUID。
    const optRes = await client
      .from("content_item_options")
      .select("id, option_key")
      .eq("content_item_id", itemId);
    if (optRes.error) fail("saveAnswer(options)", optRes.error);
    const matched = ((optRes.data ?? []) as Array<{ id: string; option_key: string }>).find(
      (o) => o.option_key === optionId,
    );

    // 服务端判分:与 answer 行比对,记录 is_correct(前端永不见 correctOptionId)。
    const answerRes = await client
      .from("content_item_answers")
      .select("correct_option_id")
      .eq("content_item_id", itemId)
      .maybeSingle();
    if (answerRes.error && answerRes.error.code !== "PGRST116") fail("saveAnswer(answer)", answerRes.error);
    const correctOptionUuid = (answerRes.data as { correct_option_id: string | null } | null)
      ?.correct_option_id;
    const isCorrect =
      matched && correctOptionUuid ? matched.id === correctOptionUuid : null;

    const { error: upsertError } = await client
      .from("exam_responses")
      .upsert(
        {
          exam_session_id: sessionId,
          content_item_id: itemId,
          selected_option_id: matched?.id ?? null,
          // 非选项作答(排序序列 / 书写文本)落 answer_text;选项题该列为 null。
          answer_text: matched ? null : optionId,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
        },
        { onConflict: "exam_session_id,content_item_id" },
      );
    if (upsertError) fail("saveAnswer(upsert)", upsertError);

    return buildSessionDomain(sessionRes.data as ExamSessionRow);
  },

  async submitSession(sessionId: string): Promise<ExamReport | null> {
    const client = admin();
    const sessionRes = await client
      .from("exam_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionRes.error && sessionRes.error.code !== "22P02") fail("submitSession(session)", sessionRes.error);
    if (!sessionRes.data) {
      return null;
    }
    const sessionRow = sessionRes.data as ExamSessionRow;
    const session = await buildSessionDomain(sessionRow);

    // H2 幂等去竞态(快路径):该会话已有报告则直接返回,不重复评分。
    // 唯一约束(exam_reports.exam_session_id)是兜底,见下方 upsert 冲突处理。
    const existingReport = await this.findReportBySession(sessionRow.id);
    if (existingReport) {
      return existingReport;
    }

    // 服务端判分(与 mock 一致):优先用会话创建时固化的快照(H3),与题库后续
    // 编辑/重新发布解耦;无快照(旧会话)回退到实时 published 题集。
    const items =
      (await this.getSessionSnapshot(sessionRow.id)) ??
      (await getPublishedItems(sessionRow.practice_set_id));
    const graded = items.map((item) => ({
      item,
      outcome: gradeResponse(item, session.answers[item.id]),
    }));
    const gradable = graded.filter((g) => g.outcome !== "ungraded");
    const correct = gradable.filter((g) => g.outcome === "correct").length;
    const total = gradable.length;
    const accuracy = total ? correct / total : 0;
    const createdAt = new Date().toISOString();
    const durationSeconds = Math.max(
      60,
      Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000),
    );

    const mistakes = graded
      .filter((g) => g.outcome === "incorrect")
      .map(({ item }) => ({
        itemId: item.id,
        yourAnswer: session.answers[item.id] ?? null,
        correctAnswer: item.correctOptionId,
      }));

    const sectionBreakdown = [
      scoreSection(items, session.answers, "listening"),
      scoreSection(items, session.answers, "reading"),
    ];

    // 多维报告:与 mock 共用同一纯函数,保证两套 repository 行为一致。
    const dimensions = computeReportDimensions(items, session.answers);

    const report: ExamReport = {
      id: "",
      sessionId: sessionRow.id,
      userId: sessionRow.profile_id,
      setSlug: session.setSlug,
      score: correct,
      total,
      accuracy,
      durationSeconds,
      mistakes,
      sectionBreakdown,
      dimensions,
      createdAt,
    };

    // 写报告(report_json 存完整领域报告,便于读回与审计)。
    // H2 去竞态:用 INSERT(非 upsert)依赖唯一约束(exam_reports.exam_session_id);
    // 两并发 submit 时后到者命中唯一冲突(Postgres 23505),回退读既有报告而非覆盖,
    // 消除「两份 report」的竞态窗口。
    const reportRes = await client
      .from("exam_reports")
      .insert({
        exam_session_id: sessionRow.id,
        profile_id: sessionRow.profile_id,
        total_questions: total,
        correct_answers: correct,
        accuracy_rate: accuracy,
        score: correct,
        duration_seconds: durationSeconds,
        report_json: report as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();
    if (reportRes.error || !reportRes.data) {
      // 唯一冲突 = 另一并发请求已提交;返回那份既有报告(幂等闭环)。
      if (reportRes.error?.code === "23505") {
        const existing = await this.findReportBySession(sessionRow.id);
        if (existing) {
          return existing;
        }
      }
      fail("submitSession(report)", reportRes.error);
    }
    report.id = (reportRes.data as { id: string }).id;
    // report_json 里回填真实报告 id。
    const { error: backfillError } = await client
      .from("exam_reports")
      .update({ report_json: report as unknown as Record<string, unknown> })
      .eq("id", report.id);
    if (backfillError) fail("submitSession(report backfill)", backfillError);

    // 会话置为已提交。
    const { error: sessionUpdateError } = await client
      .from("exam_sessions")
      .update({ status: "submitted", submitted_at: createdAt })
      .eq("id", sessionRow.id);
    if (sessionUpdateError) fail("submitSession(session update)", sessionUpdateError);

    // 错题入库(与 mock 一致:每道错题落 mistake_book)。
    // SRS 初始化:首次入库时 ease_factor/interval_days/repetitions/due_at/last_reviewed_at
    // 由 004_srs.sql 的列默认值给出(due_at=now()≈今日,ease_factor=2.5),
    // 与 @hsk/shared 的 initialSrsState 语义一致。再次错同一题时走 onConflict,
    // 不在 payload 里携带 SRS 列,从而保留既有复习进度(不重置 SRS)。
    const initSrs = initialSrsState(createdAt); // 文档化首次入库的 SRS 锚点(与 mock 对齐)。
    void initSrs;
    for (const mistake of mistakes) {
      const { error: mistakeError } = await client
        .from("mistake_book")
        .upsert(
          {
            profile_id: sessionRow.profile_id,
            content_item_id: mistake.itemId,
            first_seen_session_id: sessionRow.id,
            last_seen_at: createdAt,
            mastered: false,
          },
          { onConflict: "profile_id,content_item_id" },
        );
      if (mistakeError) fail("submitSession(mistake)", mistakeError);
    }

    return report;
  },

  async getReport(reportId: string): Promise<ExamReport | null> {
    const client = admin();
    const { data, error } = await client
      .from("exam_reports")
      .select("*")
      .eq("id", reportId)
      .maybeSingle();
    if (error && error.code !== "22P02") fail("getReport", error);
    if (!data) {
      return null;
    }
    const row = data as ExamReportRow;
    // report_json 持有完整领域报告;若缺失则按列重建一个最小报告。
    const json = row.report_json as Partial<ExamReport> | null;
    if (json && typeof json === "object" && Array.isArray(json.mistakes)) {
      return { ...(json as ExamReport), id: row.id };
    }
    return {
      id: row.id,
      sessionId: row.exam_session_id,
      userId: row.profile_id,
      setSlug: typeof json?.setSlug === "string" ? json.setSlug : "",
      score: row.score,
      total: row.total_questions,
      accuracy: row.accuracy_rate,
      durationSeconds: row.duration_seconds,
      mistakes: [],
      sectionBreakdown: [],
      createdAt: row.created_at,
    };
  },

  // ── 评分快照(H3 持久化)──────────────────────────────────────────────────
  // 会话创建时把冻结的领域 ContentItem 逐题写入 exam_session_items.snapshot_json,
  // 与 sessionId 绑定。serverless 跨实例/冷启动可读回,不依赖进程内存。
  async saveSessionSnapshot(sessionId: string, items: ContentItem[]): Promise<void> {
    const client = admin();
    // 重写前清空该会话旧快照(幂等:重复创建/重试时不残留)。
    const { error: delError } = await client
      .from("exam_session_items")
      .delete()
      .eq("exam_session_id", sessionId);
    if (delError && delError.code !== "22P02") fail("saveSessionSnapshot(clear)", delError);
    if (items.length === 0) {
      return;
    }
    const rows = items.map((item, index) => ({
      exam_session_id: sessionId,
      content_item_id: item.id,
      display_order: index + 1,
      snapshot_json: item as unknown as Record<string, unknown>,
    }));
    const { error } = await client.from("exam_session_items").insert(rows);
    if (error) fail("saveSessionSnapshot(insert)", error);
  },

  async getSessionSnapshot(sessionId: string): Promise<ContentItem[] | null> {
    const client = admin();
    const { data, error } = await client
      .from("exam_session_items")
      .select("snapshot_json, display_order")
      .eq("exam_session_id", sessionId)
      .order("display_order", { ascending: true });
    if (error && error.code !== "22P02") fail("getSessionSnapshot", error);
    const rows = (data ?? []) as Array<{
      snapshot_json: Record<string, unknown> | null;
      display_order: number;
    }>;
    // 无快照行(旧会话 / 从未冻结)→ null,由调用方回退实时题集。
    const items = rows
      .map((r) => r.snapshot_json)
      .filter((s): s is Record<string, unknown> => Boolean(s) && Object.keys(s as object).length > 0)
      .map((s) => s as unknown as ContentItem);
    return items.length > 0 ? items : null;
  },

  // ── submit 幂等(H2 去竞态)────────────────────────────────────────────────
  // 按 sessionId 反查既有报告(exam_reports.exam_session_id 唯一);并发 submit
  // 时后者据此回退到既有 report,而非生成第二份。
  async findReportBySession(sessionId: string): Promise<ExamReport | null> {
    const client = admin();
    const { data, error } = await client
      .from("exam_reports")
      .select("*")
      .eq("exam_session_id", sessionId)
      .maybeSingle();
    if (error && error.code !== "PGRST116" && error.code !== "22P02") {
      fail("findReportBySession", error);
    }
    if (!data) {
      return null;
    }
    const row = data as ExamReportRow;
    const json = row.report_json as Partial<ExamReport> | null;
    if (json && typeof json === "object" && Array.isArray(json.mistakes)) {
      return { ...(json as ExamReport), id: row.id };
    }
    return {
      id: row.id,
      sessionId: row.exam_session_id,
      userId: row.profile_id,
      setSlug: typeof json?.setSlug === "string" ? json.setSlug : "",
      score: row.score,
      total: row.total_questions,
      accuracy: row.accuracy_rate,
      durationSeconds: row.duration_seconds,
      mistakes: [],
      sectionBreakdown: [],
      createdAt: row.created_at,
    };
  },

  async getMistakes(userId: string): Promise<MistakeEntry[]> {
    const client = admin();
    const { data, error } = await client
      .from("mistake_book")
      .select("*")
      .eq("profile_id", userId)
      .order("last_seen_at", { ascending: false });
    if (error) fail("getMistakes", error);
    const rows = (data ?? []) as MistakeBookRow[];
    if (rows.length === 0) {
      return [];
    }

    // 富化 levelCode / sectionCode,并尽量解析 setSlug(从首见会话推断)。
    const itemMap = await fetchContentItems(rows.map((r) => r.content_item_id));
    const sessionIds = rows
      .map((r) => r.first_seen_session_id)
      .filter((id): id is string => Boolean(id));
    const slugBySession = new Map<string, string>();
    if (sessionIds.length > 0) {
      const sessRes = await client
        .from("exam_sessions")
        .select("id, practice_set_id")
        .in("id", sessionIds);
      if (sessRes.error) fail("getMistakes(sessions)", sessRes.error);
      const sessions = (sessRes.data ?? []) as Array<{ id: string; practice_set_id: string }>;
      const setIds = [...new Set(sessions.map((s) => s.practice_set_id))];
      const slugBySet = new Map<string, string>();
      if (setIds.length > 0) {
        const setsRes = await client.from("practice_sets").select("id, slug").in("id", setIds);
        if (setsRes.error) fail("getMistakes(sets)", setsRes.error);
        for (const s of (setsRes.data ?? []) as Array<{ id: string; slug: string }>) {
          slugBySet.set(s.id, s.slug);
        }
      }
      for (const s of sessions) {
        slugBySession.set(s.id, slugBySet.get(s.practice_set_id) ?? "");
      }
    }

    return rows.map((row) =>
      mapMistake(
        row,
        itemMap.get(row.content_item_id) ?? null,
        row.first_seen_session_id ? slugBySession.get(row.first_seen_session_id) ?? "" : "",
      ),
    );
  },

  async reviewMistake(
    userId: string,
    itemId: string,
    grade: ReviewGrade,
  ): Promise<MistakeEntry | null> {
    const client = admin();
    // 取当前错题行(含 SRS 列)作为 SM-2 的 prev 状态。
    const { data, error } = await client
      .from("mistake_book")
      .select("*")
      .eq("profile_id", userId)
      .eq("content_item_id", itemId)
      .maybeSingle();
    if (error && error.code !== "PGRST116" && error.code !== "22P02") {
      fail("reviewMistake(find)", error);
    }
    if (!data) {
      return null;
    }
    const row = data as MistakeBookRow;

    const prev = {
      easeFactor: row.ease_factor,
      intervalDays: row.interval_days,
      repetitions: row.repetitions,
      dueAt: row.due_at,
      lastReviewedAt: row.last_reviewed_at,
    };
    const srs = scheduleSrs(prev, grade);
    const mastered = grade === "easy" ? true : row.mastered;

    const { error: updateError } = await client
      .from("mistake_book")
      .update({
        ease_factor: srs.easeFactor,
        interval_days: srs.intervalDays,
        repetitions: srs.repetitions,
        due_at: srs.dueAt,
        last_reviewed_at: srs.lastReviewedAt,
        mastered,
      })
      .eq("id", row.id);
    if (updateError) fail("reviewMistake(update)", updateError);

    // 富化 levelCode / sectionCode / setSlug,与 getMistakes 同口径返回。
    const itemMap = await fetchContentItems([row.content_item_id]);
    let setSlug = "";
    if (row.first_seen_session_id) {
      const sessRes = await client
        .from("exam_sessions")
        .select("practice_set_id")
        .eq("id", row.first_seen_session_id)
        .maybeSingle();
      if (sessRes.error && sessRes.error.code !== "PGRST116" && sessRes.error.code !== "22P02") {
        fail("reviewMistake(session)", sessRes.error);
      }
      const setId = (sessRes.data as { practice_set_id: string } | null)?.practice_set_id;
      if (setId) {
        const setRes = await client
          .from("practice_sets")
          .select("slug")
          .eq("id", setId)
          .maybeSingle();
        if (setRes.error && setRes.error.code !== "PGRST116") fail("reviewMistake(set)", setRes.error);
        setSlug = (setRes.data as { slug: string } | null)?.slug ?? "";
      }
    }

    const updatedRow: MistakeBookRow = {
      ...row,
      ease_factor: srs.easeFactor,
      interval_days: srs.intervalDays,
      repetitions: srs.repetitions,
      due_at: srs.dueAt,
      last_reviewed_at: srs.lastReviewedAt,
      mastered,
    };
    return mapMistake(updatedRow, itemMap.get(row.content_item_id) ?? null, setSlug);
  },

  async getDueMistakes(userId: string): Promise<MistakeEntry[]> {
    // 基于 due_at 取到期未掌握的错题;无 due_at 的旧数据由 isMistakeDue 视为已到期。
    const all = await this.getMistakes(userId);
    const now = new Date().toISOString();
    return all.filter((m) => !m.mastered && isMistakeDue(m, now));
  },

  async getItem(itemId: string): Promise<ContentItem | null> {
    const client = admin();
    const lookups = await getLookups();
    const { data, error } = await client
      .from("content_items")
      .select(CONTENT_ITEM_SELECT)
      .eq("id", itemId)
      .maybeSingle();
    if (error && error.code !== "22P02") fail("getItem", error);
    if (!data) {
      return null;
    }
    return mapContentItem(data as unknown as ContentItemJoined, lookups);
  },

  async listAdminItems(): Promise<AdminListItem[]> {
    const client = admin();
    const lookups = await getLookups();
    const { data, error } = await client
      .from("content_items")
      .select(CONTENT_ITEM_SELECT)
      .order("created_at", { ascending: true });
    if (error) fail("listAdminItems", error);
    return ((data ?? []) as unknown as ContentItemJoined[]).map((row) => {
      const item = mapContentItem(row, lookups);
      return {
        id: item.id,
        title: item.title,
        levelCode: item.levelCode,
        sectionCode: item.sectionCode,
        questionTypeCode: item.questionTypeCode,
        reviewStatus: item.reviewStatus,
        publishStatus: item.publishStatus,
        sourceType: item.sourceType,
        copyrightCleared: item.copyrightCleared,
      };
    });
  },

  async patchAdminItem(itemId, patch) {
    const client = admin();
    const update: Record<string, unknown> = {};
    if (patch.reviewStatus) {
      update.review_status = patch.reviewStatus;
    }
    if (patch.publishStatus) {
      update.publish_status = patch.publishStatus;
    }
    if (Object.keys(update).length > 0) {
      const { error } = await client.from("content_items").update(update).eq("id", itemId);
      if (error && error.code !== "22P02") fail("patchAdminItem", error);
    }
    return this.getItem(itemId);
  },

  async createPracticeSet(input) {
    const client = admin();
    const lookups = await getLookups();
    // levelCode → level_id;sectionCode → section_id(可空)。
    const levelId = [...lookups.levelCodeById.entries()].find(
      ([, code]) => code === input.levelCode,
    )?.[0];
    if (!levelId) {
      throw new Error(`Unknown level code: ${input.levelCode}`);
    }
    let sectionId: string | null = null;
    if (input.sectionCode) {
      sectionId =
        [...lookups.sectionCodeById.entries()].find(([, code]) => code === input.sectionCode)?.[0] ??
        null;
    }
    const planId = await getPlanIdByCode(input.access);
    const insertRow: Record<string, unknown> = {
      slug: input.slug,
      title: input.title,
      description: input.description,
      level_id: levelId,
      section_id: sectionId,
      set_mode: input.mode,
      access_plan_code: planId ? input.access : input.access,
      duration_minutes: input.minutes,
    };
    if (input.id) {
      insertRow.id = input.id;
    }
    const { data, error } = await client
      .from("practice_sets")
      .insert(insertRow)
      .select("*")
      .single();
    if (error || !data) fail("createPracticeSet", error);
    const row = data as PracticeSetRow;

    // 写入 practice_set_items(保持给定顺序)。
    if (input.itemIds.length > 0) {
      const rows = input.itemIds.map((contentItemId, index) => ({
        practice_set_id: row.id,
        content_item_id: contentItemId,
        display_order: index + 1,
      }));
      const { error: itemsError } = await client.from("practice_set_items").insert(rows);
      if (itemsError) fail("createPracticeSet(items)", itemsError);
    }

    return mapPracticeSet(row, input.itemIds, lookups);
  },

  async patchPracticeSet(setIdOrSlug, patch) {
    const client = admin();
    const lookups = await getLookups();
    const current = await resolvePracticeSetRow(setIdOrSlug);
    if (!current) {
      return null;
    }
    const update: Record<string, unknown> = {};
    if (patch.slug !== undefined) update.slug = patch.slug;
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.mode !== undefined) update.set_mode = patch.mode;
    if (patch.access !== undefined) update.access_plan_code = patch.access;
    if (patch.minutes !== undefined) update.duration_minutes = patch.minutes;
    if (patch.levelCode !== undefined) {
      const levelId = [...lookups.levelCodeById.entries()].find(
        ([, code]) => code === patch.levelCode,
      )?.[0];
      if (levelId) update.level_id = levelId;
    }
    if (patch.sectionCode !== undefined) {
      update.section_id = patch.sectionCode
        ? [...lookups.sectionCodeById.entries()].find(([, code]) => code === patch.sectionCode)?.[0] ??
          null
        : null;
    }

    if (Object.keys(update).length > 0) {
      const { error } = await client.from("practice_sets").update(update).eq("id", current.id);
      if (error) fail("patchPracticeSet", error);
    }

    // itemIds 变更:重置 practice_set_items。
    let itemIds = await getSetItemIds(current.id);
    if (patch.itemIds !== undefined) {
      const { error: delError } = await client
        .from("practice_set_items")
        .delete()
        .eq("practice_set_id", current.id);
      if (delError) fail("patchPracticeSet(delete items)", delError);
      if (patch.itemIds.length > 0) {
        const rows = patch.itemIds.map((contentItemId, index) => ({
          practice_set_id: current.id,
          content_item_id: contentItemId,
          display_order: index + 1,
        }));
        const { error: insError } = await client.from("practice_set_items").insert(rows);
        if (insError) fail("patchPracticeSet(insert items)", insError);
      }
      itemIds = patch.itemIds;
    }

    const refreshed = await resolvePracticeSetRow(current.id);
    if (!refreshed) {
      return null;
    }
    return mapPracticeSet(refreshed, itemIds, lookups);
  },

  async publishItem(itemId, publishStatus) {
    return this.patchAdminItem(itemId, { publishStatus });
  },

  async listUsers(): Promise<AppUser[]> {
    const client = admin();
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) fail("listUsers", error);
    return ((data ?? []) as ProfileRow[]).map(mapProfileToUser);
  },

  async getUserById(userId: string): Promise<AppUser | null> {
    const client = admin();
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error && error.code !== "22P02") fail("getUserById", error);
    if (!data) {
      return null;
    }
    return mapProfileToUser(data as ProfileRow);
  },

  async findUserByEmail(email: string): Promise<AppUser | null> {
    const client = admin();
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (error && error.code !== "PGRST116") fail("findUserByEmail", error);
    if (!data) {
      return null;
    }
    return mapProfileToUser(data as ProfileRow);
  },

  async upsertUser(user: AppUser): Promise<AppUser> {
    const client = admin();
    const { error } = await client.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role === "anonymous" ? "learner" : user.role,
        default_plan_code: user.plan,
      },
      { onConflict: "id" },
    );
    if (error) fail("upsertUser", error);
    return user;
  },

  async getRole(userId: string): Promise<UserRole> {
    const client = admin();
    const { data, error } = await client
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (error && error.code !== "22P02") fail("getRole", error);
    const role = (data as { role: string } | null)?.role;
    return role ? asUserRole(role) : "anonymous";
  },

  async getPasswordHash(userId: string): Promise<string | null> {
    const client = admin();
    const { data, error } = await client
      .from("profiles")
      .select("password_hash")
      .eq("id", userId)
      .maybeSingle();
    if (error && error.code !== "22P02") fail("getPasswordHash", error);
    return (data as { password_hash: string | null } | null)?.password_hash ?? null;
  },

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    const client = admin();
    const { error } = await client
      .from("profiles")
      .update({ password_hash: passwordHash })
      .eq("id", userId);
    if (error) fail("setPasswordHash", error);
  },

  async getSubscription(userId: string): Promise<Subscription | null> {
    const client = admin();
    const { data, error } = await client
      .from("subscriptions")
      .select("*")
      .eq("profile_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error && error.code !== "PGRST116" && error.code !== "22P02") fail("getSubscription", error);
    if (!data) {
      return null;
    }
    const row = data as {
      profile_id: string;
      plan_id: string;
      status: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      current_period_ends_at: string | null;
      updated_at: string;
    };
    const planCode = await getPlanCodeById(row.plan_id);
    return {
      userId: row.profile_id,
      plan: planCode,
      status: asSubscriptionStatus(row.status),
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      currentPeriodEndsAt: row.current_period_ends_at,
      updatedAt: row.updated_at,
    };
  },

  async setSubscription(input): Promise<Subscription> {
    const client = admin();
    const planId = await getPlanIdByCode(input.plan);
    if (!planId) {
      throw new Error(`Unknown plan code: ${input.plan}`);
    }
    const now = new Date().toISOString();

    // 每用户单条订阅:存在则更新,否则插入(schema 未给 profile_id 唯一约束,
    // 故手动 find-then-write,避免重复行)。
    const existing = await client
      .from("subscriptions")
      .select("id")
      .eq("profile_id", input.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing.error && existing.error.code !== "PGRST116" && existing.error.code !== "22P02") {
      fail("setSubscription(find)", existing.error);
    }

    const writeRow = {
      profile_id: input.userId,
      plan_id: planId,
      status: input.status,
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      current_period_ends_at: input.currentPeriodEndsAt ?? null,
    };

    const existingId = (existing.data as { id: string } | null)?.id;
    if (existingId) {
      const { error } = await client.from("subscriptions").update(writeRow).eq("id", existingId);
      if (error) fail("setSubscription(update)", error);
    } else {
      const { error } = await client.from("subscriptions").insert(writeRow);
      if (error) fail("setSubscription(insert)", error);
    }

    // entitlement 同步到 profiles.default_plan_code(active → 该套餐,否则 free),
    // 与 mock 的 user.plan 同步语义一致。
    const subscription: Subscription = {
      userId: input.userId,
      plan: input.plan,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      currentPeriodEndsAt: input.currentPeriodEndsAt ?? null,
      updatedAt: now,
    };
    const effectivePlan: PlanCode = hasPaidAccess(subscription) ? input.plan : "free";
    const { error: profileError } = await client
      .from("profiles")
      .update({ default_plan_code: effectivePlan })
      .eq("id", input.userId);
    // profile 不存在时不阻断订阅写入(与 mock 的可选同步一致)。
    if (profileError && profileError.code !== "22P02") fail("setSubscription(profile sync)", profileError);

    return subscription;
  },

  async addAuditLog(input): Promise<void> {
    const client = admin();
    const { error } = await client.from("audit_logs").insert({
      actor_profile_id: input.actorId,
      target_table: input.targetTable,
      target_id: input.targetId,
      action: input.action,
      payload_json: input.payload ?? null,
    });
    if (error) fail("addAuditLog", error);
  },
};
