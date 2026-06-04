import { beforeEach, describe, expect, it } from "vitest";

import { isMistakeDue, scheduleSrs } from "@hsk/shared";

import { mockRepository } from "./mock-repository";
import { getRepository } from "./repository";

// ── 测试约定 ────────────────────────────────────────────────────────────────
// mock-repository 的状态挂在 globalThis.__HSK_PREP_STORE__ 单例上(跨请求/HMR 存活)。
// 每个用例前必须清空,否则会话/报告/错题会在用例间串台。删 key 后下次 getStore()
// 会用 createStore() 重新种子(demo 用户 + sampleSets/sampleItems)。
//
// 本测试**真实调用** mockRepository 的方法并断言其行为(非 wiring / 非 mock 被测对象)。

const MOCK_SET_SLUG = "hsk1-mock-01";
const USER = "demo-learner";

// sampleSets 里 hsk1-mock-01 含 10 道题(item_hsk1_001..010)。
// 正确答案:005/006/010 → "B",其余 7 道 → "A"(见 shared/sample-data.ts)。
// 测试统一全部作答 "A" → 3 道错(005/006/010),7 道对。
const CORRECT_B_ITEMS = ["item_hsk1_005", "item_hsk1_006", "item_hsk1_010"];

function resetStore() {
  (globalThis as { __HSK_PREP_STORE__?: unknown }).__HSK_PREP_STORE__ = undefined;
}

// 建会话 → 冻结快照 → 全部作答 "A" → 提交。返回 { session, report }。
async function runSessionAllA() {
  const session = await mockRepository.createSession({
    userId: USER,
    setIdOrSlug: MOCK_SET_SLUG,
    mode: "mock_exam",
  });
  const items = await mockRepository.getPublishedItemsForSet(MOCK_SET_SLUG);
  await mockRepository.saveSessionSnapshot(session.id, items);
  for (const item of items) {
    await mockRepository.saveAnswer({
      sessionId: session.id,
      itemId: item.id,
      optionId: "A",
    });
  }
  const report = await mockRepository.submitSession(session.id);
  return { session, report };
}

beforeEach(() => {
  resetStore();
});

describe("getRepository() 配置分支", () => {
  it("无 Supabase env 时返回 mock repository(同一单例)", () => {
    // 测试环境未注入 NEXT_PUBLIC_SUPABASE_URL/ANON_KEY → isSupabaseConfigured() 为 false。
    expect(getRepository()).toBe(mockRepository);
  });
});

describe("createSession + 会话快照", () => {
  it("createSession 生成 active 会话并绑定 set", async () => {
    const session = await mockRepository.createSession({
      userId: USER,
      setIdOrSlug: MOCK_SET_SLUG,
      mode: "mock_exam",
    });
    expect(session.id).toBeTruthy();
    expect(session.userId).toBe(USER);
    expect(session.setSlug).toBe(MOCK_SET_SLUG);
    expect(session.status).toBe("active");
    expect(session.answers).toEqual({});

    const fetched = await mockRepository.getSession(session.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(session.id);
  });

  it("createSession 对未知 set 抛错", async () => {
    await expect(
      mockRepository.createSession({
        userId: USER,
        setIdOrSlug: "no-such-set",
        mode: "mock_exam",
      }),
    ).rejects.toThrow(/Set not found/);
  });

  it("saveSessionSnapshot 存,getSessionSnapshot 取回同等内容", async () => {
    const session = await mockRepository.createSession({
      userId: USER,
      setIdOrSlug: MOCK_SET_SLUG,
      mode: "mock_exam",
    });
    const items = await mockRepository.getPublishedItemsForSet(MOCK_SET_SLUG);
    expect(items.length).toBe(10);

    await mockRepository.saveSessionSnapshot(session.id, items);
    const snap = await mockRepository.getSessionSnapshot(session.id);
    expect(snap).not.toBeNull();
    expect(snap?.length).toBe(items.length);
    expect(snap?.map((i) => i.id)).toEqual(items.map((i) => i.id));
  });

  it("快照是深拷贝 —— 后续 mutate 原数组不影响已存快照(冻结语义)", async () => {
    const session = await mockRepository.createSession({
      userId: USER,
      setIdOrSlug: MOCK_SET_SLUG,
      mode: "mock_exam",
    });
    const items = await mockRepository.getPublishedItemsForSet(MOCK_SET_SLUG);
    await mockRepository.saveSessionSnapshot(session.id, items);

    // 篡改快照源对象的正确答案。
    items[0] = { ...items[0], correctOptionId: "Z" };

    const snap = await mockRepository.getSessionSnapshot(session.id);
    // 快照里的题不应被外部 mutation 影响。
    expect(snap?.find((i) => i.id === "item_hsk1_001")?.correctOptionId).toBe("A");
  });

  it("未冻结会话的 getSessionSnapshot 返回 null", async () => {
    const session = await mockRepository.createSession({
      userId: USER,
      setIdOrSlug: MOCK_SET_SLUG,
      mode: "mock_exam",
    });
    expect(await mockRepository.getSessionSnapshot(session.id)).toBeNull();
  });
});

describe("saveAnswer", () => {
  it("正常保存答案到 active 会话", async () => {
    const session = await mockRepository.createSession({
      userId: USER,
      setIdOrSlug: MOCK_SET_SLUG,
      mode: "mock_exam",
    });
    const updated = await mockRepository.saveAnswer({
      sessionId: session.id,
      itemId: "item_hsk1_001",
      optionId: "A",
    });
    expect(updated?.answers["item_hsk1_001"]).toBe("A");

    // 持久化:重新取会话仍带该答案。
    const refetched = await mockRepository.getSession(session.id);
    expect(refetched?.answers["item_hsk1_001"]).toBe("A");
  });

  it("按 itemId 归属:多题各存各的,不互相覆盖", async () => {
    const session = await mockRepository.createSession({
      userId: USER,
      setIdOrSlug: MOCK_SET_SLUG,
      mode: "mock_exam",
    });
    await mockRepository.saveAnswer({ sessionId: session.id, itemId: "item_hsk1_001", optionId: "A" });
    await mockRepository.saveAnswer({ sessionId: session.id, itemId: "item_hsk1_002", optionId: "B" });
    const after = await mockRepository.saveAnswer({
      sessionId: session.id,
      itemId: "item_hsk1_001",
      optionId: "C",
    });
    expect(after?.answers).toMatchObject({
      item_hsk1_001: "C", // 同题二次作答覆盖
      item_hsk1_002: "B", // 他题不受影响
    });
  });

  it("守门:已提交会话拒绝写入,答案不被改", async () => {
    const { session } = await runSessionAllA();
    const submitted = await mockRepository.getSession(session.id);
    expect(submitted?.status).toBe("submitted");

    const result = await mockRepository.saveAnswer({
      sessionId: session.id,
      itemId: "item_hsk1_001",
      optionId: "B", // 试图把原 "A" 改成 "B"
    });
    // 返回当前(已提交)态,答案保持提交时的值,不被改写。
    expect(result?.status).toBe("submitted");
    expect(result?.answers["item_hsk1_001"]).toBe("A");
  });

  it("对不存在的会话返回 null", async () => {
    expect(
      await mockRepository.saveAnswer({
        sessionId: "missing-session",
        itemId: "item_hsk1_001",
        optionId: "A",
      }),
    ).toBeNull();
  });
});

describe("submitSession", () => {
  it("正常评分:生成 report,分数与错题正确", async () => {
    const { session, report } = await runSessionAllA();
    expect(report).not.toBeNull();
    expect(report?.sessionId).toBe(session.id);
    expect(report?.userId).toBe(USER);
    expect(report?.total).toBe(10);
    expect(report?.score).toBe(7);
    expect(report?.accuracy).toBeCloseTo(7 / 10, 5);

    const mistakeIds = (report?.mistakes ?? []).map((m) => m.itemId).sort();
    expect(mistakeIds).toEqual([...CORRECT_B_ITEMS].sort());

    // 会话被标记 submitted + submittedAt。
    const after = await mockRepository.getSession(session.id);
    expect(after?.status).toBe("submitted");
    expect(after?.submittedAt).toBeTruthy();
  });

  it("report 可通过 getReport / findReportBySession 取回", async () => {
    const { session, report } = await runSessionAllA();
    expect(await mockRepository.getReport(report!.id)).toMatchObject({ id: report!.id });
    const bySession = await mockRepository.findReportBySession(session.id);
    expect(bySession?.id).toBe(report!.id);
  });

  it("幂等:重复 submit 返回既有 report,不重复评分", async () => {
    const { session, report: first } = await runSessionAllA();
    const second = await mockRepository.submitSession(session.id);
    // 同一份报告(同 id),非新生成。
    expect(second?.id).toBe(first!.id);
    expect(second).toEqual(first);
  });

  it("对不存在的会话返回 null", async () => {
    expect(await mockRepository.submitSession("missing-session")).toBeNull();
  });
});

describe("错题本", () => {
  it("提交后错题写入,getMistakes 返回该 user 的错题", async () => {
    await runSessionAllA();
    const mistakes = await mockRepository.getMistakes(USER);
    expect(mistakes.map((m) => m.itemId).sort()).toEqual([...CORRECT_B_ITEMS].sort());
    // 首次入库初始化 SRS:dueAt 存在且 repetitions 归零。
    for (const m of mistakes) {
      expect(m.userId).toBe(USER);
      expect(m.dueAt).toBeTruthy();
      expect(m.repetitions).toBe(0);
      expect(m.mastered).toBe(false);
    }
  });

  it("每 user/item 一行:同一题再次做错不新增行", async () => {
    // 第一次:产生 3 条错题(005/006/010)。
    await runSessionAllA();
    const firstMistakes = await mockRepository.getMistakes(USER);
    expect(firstMistakes.length).toBe(3);
    const firstIds = new Set(firstMistakes.map((m) => m.id));

    // 第二次:同一套卷、同样全 "A" → 同样 3 道错。错题本应仍是 3 行(每 user/item 一行)。
    await runSessionAllA();
    const secondMistakes = await mockRepository.getMistakes(USER);
    expect(secondMistakes.length).toBe(3);
    // 行 id 不变(更新而非新增)。
    for (const m of secondMistakes) {
      expect(firstIds.has(m.id)).toBe(true);
    }
  });

  it("重复做错:保留既有 SRS 进度,仅更新 last_seen(createdAt 锚点)", async () => {
    // 先建立一条已被复习推进过的错题。
    await runSessionAllA();
    const before = (await mockRepository.getMistakes(USER)).find(
      (m) => m.itemId === "item_hsk1_005",
    )!;
    // 用 good 推进其 SRS(到期状态下生效)。
    const reviewed = await mockRepository.reviewMistake(USER, "item_hsk1_005", "good");
    expect(reviewed?.repetitions).toBe(1);
    const advancedDueAt = reviewed!.dueAt;

    // 再次做错同一题。
    await runSessionAllA();
    const after = (await mockRepository.getMistakes(USER)).find(
      (m) => m.itemId === "item_hsk1_005",
    )!;
    // SRS 进度被保留(repetitions / dueAt 不被重置回初始)。
    expect(after.id).toBe(before.id);
    expect(after.repetitions).toBe(1);
    expect(after.dueAt).toBe(advancedDueAt);
  });

  it("错题按 user 隔离:别的 user 看不到", async () => {
    await runSessionAllA();
    expect((await mockRepository.getMistakes("demo-reviewer")).length).toBe(0);
  });
});

describe("reviewMistake + SRS 守门", () => {
  it("到期错题:good 评分推进 SRS(repetitions+1,dueAt 后移)", async () => {
    await runSessionAllA();
    const entry = (await mockRepository.getMistakes(USER)).find(
      (m) => m.itemId === "item_hsk1_006",
    )!;
    // 首次入库 dueAt = createdAt(今日)→ 已到期,可推进。
    expect(isMistakeDue(entry)).toBe(true);

    const after = await mockRepository.reviewMistake(USER, "item_hsk1_006", "good");
    expect(after?.repetitions).toBe(1);
    // dueAt 后移到未来(已不到期)。
    expect(isMistakeDue(after!)).toBe(false);
    expect(new Date(after!.dueAt!).getTime()).toBeGreaterThan(new Date(entry.dueAt!).getTime());
  });

  it("守门:未到期重复调度被拒,不叠加 interval", async () => {
    await runSessionAllA();
    // 第一次复习 → dueAt 推到未来(未到期)。
    const firstReview = await mockRepository.reviewMistake(USER, "item_hsk1_010", "good");
    expect(isMistakeDue(firstReview!)).toBe(false);
    const intervalAfterFirst = firstReview!.intervalDays;
    const dueAfterFirst = firstReview!.dueAt;
    const repsAfterFirst = firstReview!.repetitions;

    // 立即第二次复习:未到期 → isMistakeDue 守门返回当前态,不再推进。
    const secondReview = await mockRepository.reviewMistake(USER, "item_hsk1_010", "good");
    expect(secondReview?.intervalDays).toBe(intervalAfterFirst);
    expect(secondReview?.dueAt).toBe(dueAfterFirst);
    expect(secondReview?.repetitions).toBe(repsAfterFirst); // 未叠加
  });

  it("easy 评分标记 mastered", async () => {
    await runSessionAllA();
    const after = await mockRepository.reviewMistake(USER, "item_hsk1_005", "easy");
    expect(after?.mastered).toBe(true);
  });

  it("对不存在的错题返回 null", async () => {
    await runSessionAllA();
    expect(await mockRepository.reviewMistake(USER, "no-such-item", "good")).toBeNull();
    expect(await mockRepository.reviewMistake("no-such-user", "item_hsk1_005", "good")).toBeNull();
  });

  it("getDueMistakes:复习推进后该题不再到期(从到期列表移除)", async () => {
    await runSessionAllA();
    const dueBefore = await mockRepository.getDueMistakes(USER);
    expect(dueBefore.map((m) => m.itemId).sort()).toEqual([...CORRECT_B_ITEMS].sort());

    await mockRepository.reviewMistake(USER, "item_hsk1_005", "good");
    const dueAfter = await mockRepository.getDueMistakes(USER);
    expect(dueAfter.map((m) => m.itemId)).not.toContain("item_hsk1_005");
    expect(dueAfter.length).toBe(2);
  });

  it("守门行为与 shared.scheduleSrs 推进口径一致(交叉验证)", async () => {
    await runSessionAllA();
    const entry = (await mockRepository.getMistakes(USER)).find(
      (m) => m.itemId === "item_hsk1_006",
    )!;
    // 用纯函数预测首次 good 推进后的 repetitions/intervalDays,与 repo 返回比对。
    const predicted = scheduleSrs(entry, "good", new Date().toISOString());
    const actual = await mockRepository.reviewMistake(USER, "item_hsk1_006", "good");
    expect(actual?.repetitions).toBe(predicted.repetitions);
    expect(actual?.intervalDays).toBe(predicted.intervalDays);
  });
});
