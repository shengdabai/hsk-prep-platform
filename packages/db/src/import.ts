import type { SupabaseClient } from "@supabase/supabase-js";

import type { ImportPayload, LevelCode, QuestionTypeCode, SectionCode } from "@hsk/shared";

import { createSupabaseAdminClient } from "./supabase";

// 内容导入(content_items + options + answers + tags + practice_sets)。
//
// 取代 apps/web/scripts/import-items.ts 里残缺的 importToSupabase:
//   - 旧实现把 title 写成 item.id、不写 level/section/question_type 外键、
//     不写 options/answers/sets、并用 `as never` 压类型,导入的题完全不可用。
//   - 此实现解析所有外键(level/section/question_type/plan),逐题写
//     content_items → content_item_options → content_item_answers(回填
//     correct_option_id 的 UUID)→ content_item_tags,再写 practice_sets +
//     practice_set_items。全程精确类型,零 `as never` / 零 any。
//
// 幂等策略:content_items 以 title 作为外部稳定键 upsert(schema 未给 title 唯一
// 约束,故先 find-by-title 再 insert/update);options/answers 在重写前清空该题旧行;
// practice_sets 走 slug onConflict;practice_set_items 重置后按 itemIds 顺序写。

type ImportClient = SupabaseClient;

function fail(context: string, error: { message?: string } | null): never {
  throw new Error(`Supabase import error in ${context}: ${error?.message ?? "unknown error"}`);
}

type CodeIdMap = Map<string, string>;

async function loadDimension(
  client: ImportClient,
  table: "levels" | "question_types",
): Promise<CodeIdMap> {
  const { data, error } = await client.from(table).select("id, code");
  if (error) fail(`loadDimension(${table})`, error);
  const map: CodeIdMap = new Map();
  for (const row of (data ?? []) as Array<{ id: string; code: string }>) {
    map.set(row.code, row.id);
  }
  return map;
}

// sections 的 code 在 (level_id, code) 上唯一,按 levelId+code 双键索引。
async function loadSections(client: ImportClient): Promise<Map<string, string>> {
  const { data, error } = await client.from("sections").select("id, code, level_id");
  if (error) fail("loadSections", error);
  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{ id: string; code: string; level_id: string }>) {
    map.set(`${row.level_id}::${row.code}`, row.id);
  }
  return map;
}

async function loadPlanCodes(client: ImportClient): Promise<Set<string>> {
  const { data, error } = await client.from("plans").select("code");
  if (error) fail("loadPlans", error);
  return new Set(((data ?? []) as Array<{ code: string }>).map((r) => r.code));
}

// tag code → id;缺失的 tag 即时插入,返回 code→id 映射。
async function resolveTagIds(client: ImportClient, codes: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(codes)].filter(Boolean);
  if (unique.length === 0) {
    return map;
  }
  const { data, error } = await client.from("tags").select("id, code").in("code", unique);
  if (error) fail("resolveTagIds(select)", error);
  for (const row of (data ?? []) as Array<{ id: string; code: string }>) {
    map.set(row.code, row.id);
  }
  const missing = unique.filter((code) => !map.has(code));
  if (missing.length > 0) {
    const { data: inserted, error: insErr } = await client
      .from("tags")
      .upsert(
        missing.map((code) => ({ code, label: code })),
        { onConflict: "code" },
      )
      .select("id, code");
    if (insErr) fail("resolveTagIds(insert)", insErr);
    for (const row of (inserted ?? []) as Array<{ id: string; code: string }>) {
      map.set(row.code, row.id);
    }
  }
  return map;
}

// 以 title 为外部稳定键 upsert 一条 content_item,返回其 UUID。
async function upsertContentItem(
  client: ImportClient,
  payload: {
    title: string;
    stem: string;
    prompt: string;
    explanation: string;
    levelId: string;
    sectionId: string;
    questionTypeId: string;
    reviewStatus: string;
    publishStatus: string;
    sourceType: string;
    copyrightStatus: string;
  },
): Promise<string> {
  const writeRow = {
    title: payload.title,
    stem: payload.stem,
    prompt: payload.prompt,
    explanation: payload.explanation,
    level_id: payload.levelId,
    section_id: payload.sectionId,
    question_type_id: payload.questionTypeId,
    review_status: payload.reviewStatus,
    publish_status: payload.publishStatus,
    source_type: payload.sourceType,
    copyright_status: payload.copyrightStatus,
  };

  const existing = await client
    .from("content_items")
    .select("id")
    .eq("title", payload.title)
    .maybeSingle();
  if (existing.error && existing.error.code !== "PGRST116") {
    fail("upsertContentItem(find)", existing.error);
  }
  const existingId = (existing.data as { id: string } | null)?.id;
  if (existingId) {
    const { error } = await client.from("content_items").update(writeRow).eq("id", existingId);
    if (error) fail("upsertContentItem(update)", error);
    return existingId;
  }
  const { data, error } = await client
    .from("content_items")
    .insert(writeRow)
    .select("id")
    .single();
  if (error || !data) fail("upsertContentItem(insert)", error);
  return (data as { id: string }).id;
}

// 重写一题的 options,返回 option_key → UUID 映射(供 answer 回填正确项 UUID)。
async function writeOptions(
  client: ImportClient,
  contentItemId: string,
  options: ImportPayload["items"][number]["options"],
): Promise<Map<string, string>> {
  const { error: delErr } = await client
    .from("content_item_options")
    .delete()
    .eq("content_item_id", contentItemId);
  if (delErr) fail("writeOptions(delete)", delErr);

  const keyToId = new Map<string, string>();
  if (options.length === 0) {
    return keyToId;
  }
  const rows = options.map((opt, index) => ({
    content_item_id: contentItemId,
    option_key: opt.id,
    option_text: opt.text,
    display_order: index + 1,
  }));
  const { data, error } = await client
    .from("content_item_options")
    .insert(rows)
    .select("id, option_key");
  if (error) fail("writeOptions(insert)", error);
  for (const row of (data ?? []) as Array<{ id: string; option_key: string }>) {
    keyToId.set(row.option_key, row.id);
  }
  return keyToId;
}

// 写该题的 answer 行(content_item_answers 在 content_item_id 上唯一)。
// 选项题:correct_option_id 指向正确项 UUID;非选项题:correctOptionId 作为 answer_text 落库。
async function writeAnswer(
  client: ImportClient,
  contentItemId: string,
  correctOptionKey: string,
  optionKeyToId: Map<string, string>,
): Promise<void> {
  const matchedOptionId = optionKeyToId.get(correctOptionKey) ?? null;
  // 有匹配选项 → 选择题;否则把正确答案视为文本(order 序列 / 书写参考答案)。
  const isChoice = matchedOptionId !== null;
  const writeRow = {
    content_item_id: contentItemId,
    correct_option_id: matchedOptionId,
    answer_text: isChoice ? null : correctOptionKey || null,
    grading_strategy: isChoice ? "single_choice" : "auto_text",
  };
  const { error } = await client
    .from("content_item_answers")
    .upsert(writeRow, { onConflict: "content_item_id" });
  if (error) fail("writeAnswer", error);
}

// 重写该题的 tag 关联。
async function writeItemTags(
  client: ImportClient,
  contentItemId: string,
  tagIds: string[],
): Promise<void> {
  const { error: delErr } = await client
    .from("content_item_tags")
    .delete()
    .eq("content_item_id", contentItemId);
  if (delErr) fail("writeItemTags(delete)", delErr);
  if (tagIds.length === 0) {
    return;
  }
  const rows = tagIds.map((tagId) => ({ content_item_id: contentItemId, tag_id: tagId }));
  const { error } = await client
    .from("content_item_tags")
    .upsert(rows, { onConflict: "content_item_id,tag_id" });
  if (error) fail("writeItemTags(insert)", error);
}

export type ImportResult = {
  itemCount: number;
  setCount: number;
  // 导入产生的 title → content_item UUID 映射(便于审计/二次写入)。
  itemIdByTitle: Map<string, string>;
};

/**
 * 把 ImportPayload(领域 code 形态)正确写入 Supabase 关系模型。
 *
 * - 解析 level/section/question_type/plan 外键(维度表缺 code 即报错,不静默写脏数据)。
 * - 逐题 upsert content_items,重写 options/answers/tags。
 * - 写 practice_sets(slug onConflict)与 practice_set_items(按 itemIds 顺序)。
 *
 * 注:practice_set.itemIds 用的是题目的外部 id(= ContentItem.title 存储键),
 * 通过本次导入建立的 itemIdByTitle 映射解析为 content_item UUID;映射不到的 id 跳过并报错。
 */
export async function importContent(
  payload: ImportPayload,
  injectedClient?: ImportClient,
): Promise<ImportResult> {
  const client: ImportClient = injectedClient ?? (createSupabaseAdminClient() as ImportClient);

  const levelIdByCode = await loadDimension(client, "levels");
  const questionTypeIdByCode = await loadDimension(client, "question_types");
  const sectionIdByLevelCode = await loadSections(client);
  const planCodes = await loadPlanCodes(client);

  const itemIdByTitle = new Map<string, string>();

  for (const item of payload.items) {
    const levelId = levelIdByCode.get(item.levelCode satisfies LevelCode);
    if (!levelId) fail("importContent(level)", { message: `Unknown level code: ${item.levelCode}` });
    const sectionId = sectionIdByLevelCode.get(
      `${levelId}::${item.sectionCode satisfies SectionCode}`,
    );
    if (!sectionId) {
      fail("importContent(section)", {
        message: `Unknown section ${item.sectionCode} for level ${item.levelCode}`,
      });
    }
    const questionTypeId = questionTypeIdByCode.get(item.questionTypeCode satisfies QuestionTypeCode);
    if (!questionTypeId) {
      fail("importContent(questionType)", {
        message: `Unknown question type code: ${item.questionTypeCode}`,
      });
    }

    const contentItemId = await upsertContentItem(client, {
      title: item.title || item.id,
      stem: item.stem,
      prompt: item.prompt,
      explanation: item.explanation,
      levelId,
      sectionId,
      questionTypeId,
      reviewStatus: item.reviewStatus,
      publishStatus: item.publishStatus,
      sourceType: item.sourceType,
      copyrightStatus: item.copyrightCleared ? "cleared" : "pending",
    });
    itemIdByTitle.set(item.id, contentItemId);
    itemIdByTitle.set(item.title || item.id, contentItemId);

    const optionKeyToId = await writeOptions(client, contentItemId, item.options);
    await writeAnswer(client, contentItemId, item.correctOptionId, optionKeyToId);

    const tagIds = await resolveTagIds(client, item.tags ?? []);
    await writeItemTags(client, contentItemId, [...tagIds.values()]);
  }

  let setCount = 0;
  for (const set of payload.sets ?? []) {
    const levelId = levelIdByCode.get(set.levelCode satisfies LevelCode);
    if (!levelId) fail("importContent(set level)", { message: `Unknown level code: ${set.levelCode}` });
    let sectionId: string | null = null;
    if (set.sectionCode) {
      sectionId =
        sectionIdByLevelCode.get(`${levelId}::${set.sectionCode satisfies SectionCode}`) ?? null;
    }
    // access plan code 必须是已 seed 的 plan;未知则回退 free(不阻断导入)。
    const accessPlanCode = planCodes.has(set.access) ? set.access : "free";

    const setRow = {
      slug: set.slug,
      title: set.title,
      description: set.description,
      level_id: levelId,
      section_id: sectionId,
      set_mode: set.mode,
      access_plan_code: accessPlanCode,
      duration_minutes: set.minutes,
    };
    const { data, error } = await client
      .from("practice_sets")
      .upsert(setRow, { onConflict: "slug" })
      .select("id")
      .single();
    if (error || !data) fail("importContent(set upsert)", error);
    const practiceSetId = (data as { id: string }).id;
    setCount += 1;

    // 重置 practice_set_items 再按顺序写入(把外部 id 解析为 content_item UUID)。
    const { error: delErr } = await client
      .from("practice_set_items")
      .delete()
      .eq("practice_set_id", practiceSetId);
    if (delErr) fail("importContent(set items delete)", delErr);

    const linkRows: Array<{
      practice_set_id: string;
      content_item_id: string;
      display_order: number;
    }> = [];
    set.itemIds.forEach((externalId, index) => {
      const contentItemId = itemIdByTitle.get(externalId);
      if (!contentItemId) {
        fail("importContent(set item)", {
          message: `practice_set ${set.slug} references unknown item id: ${externalId}`,
        });
      }
      linkRows.push({
        practice_set_id: practiceSetId,
        content_item_id: contentItemId,
        display_order: index + 1,
      });
    });
    if (linkRows.length > 0) {
      const { error: insErr } = await client.from("practice_set_items").insert(linkRows);
      if (insErr) fail("importContent(set items insert)", insErr);
    }
  }

  return { itemCount: payload.items.length, setCount, itemIdByTitle };
}
