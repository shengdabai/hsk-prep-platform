import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  computeReportDimensions,
  gradeResponse,
  initialSrsState,
  isAutoGradable,
  isMistakeDue,
  levels,
  sampleItems,
  sampleSets,
  scheduleSrs,
  type AdminListItem,
  type AppUser,
  type ContentItem,
  type ExamReport,
  type ExamSession,
  type MistakeEntry,
  type PracticeSet,
  type PublishStatus,
  type ReviewGrade,
  type ReviewStatus,
  type Subscription,
  type UserRole,
} from "@hsk/shared";

import { hashPassword } from "./password";
import type { Repository } from "./types";

// demo 账户的种子密码,文档化于 README / .env.example。
const DEMO_PASSWORD = "demo1234";

type AuditLogEntry = {
  id: string;
  actorId: string | null;
  targetTable: string;
  targetId: string;
  action: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type Store = {
  users: Map<string, AppUser>;
  items: Map<string, ContentItem>;
  sets: Map<string, PracticeSet>;
  sessions: Map<string, ExamSession>;
  reports: Map<string, ExamReport>;
  mistakes: Map<string, MistakeEntry>;
  credentials: Map<string, string>;
  subscriptions: Map<string, Subscription>;
  auditLogs: AuditLogEntry[];
  // 评分快照(H3):sessionId → 冻结的题目数组(深拷贝,含 correctOptionId / answerText)。
  snapshots: Map<string, ContentItem[]>;
};

declare global {
  // eslint-disable-next-line no-var
  var __HSK_PREP_STORE__: Store | undefined;
}

// 从 content/published/*.generated.json 加载 content-engine 自动产出的已发布内容,
// 使生成的题库(含 imageUrl/audioUrl)在 demo(mock)平台直接可见。best-effort:
// 目录/文件缺失或格式错误时静默跳过,绝不阻断启动。
function loadGeneratedContent(): { items: ContentItem[]; sets: PracticeSet[] } {
  const empty = { items: [] as ContentItem[], sets: [] as PracticeSet[] };
  try {
    // 运行时 cwd 为 apps/web;仓库根的 content/published 在其上两级。
    const dir = join(process.cwd(), "..", "..", "content", "published");
    if (!existsSync(dir)) {
      return empty;
    }
    const items: ContentItem[] = [];
    const sets: PracticeSet[] = [];
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".generated.json")) {
        continue;
      }
      try {
        const payload = JSON.parse(readFileSync(join(dir, file), "utf-8")) as {
          items?: ContentItem[];
          sets?: PracticeSet[];
        };
        if (Array.isArray(payload.items)) items.push(...payload.items);
        if (Array.isArray(payload.sets)) sets.push(...payload.sets);
      } catch {
        // 单个文件坏不影响其余。
      }
    }
    return { items, sets };
  } catch {
    return empty;
  }
}

function createStore(): Store {
  const generated = loadGeneratedContent();
  const itemsMap = new Map<string, ContentItem>(sampleItems.map((item) => [item.id, item]));
  for (const item of generated.items) {
    itemsMap.set(item.id, item);
  }
  const setsMap = new Map<string, PracticeSet>(sampleSets.map((set) => [set.id, set]));
  for (const set of generated.sets) {
    setsMap.set(set.id, set);
  }
  return {
    users: new Map<string, AppUser>([
      [
        "demo-learner",
        {
          id: "demo-learner",
          email: "learner@demo.local",
          fullName: "Demo Learner",
          role: "learner",
          plan: "pro",
        },
      ],
      [
        "demo-reviewer",
        {
          id: "demo-reviewer",
          email: "reviewer@demo.local",
          fullName: "Demo Reviewer",
          role: "reviewer",
          plan: "institution",
        },
      ],
      [
        "demo-admin",
        {
          id: "demo-admin",
          email: "admin@demo.local",
          fullName: "Demo Admin",
          role: "admin",
          plan: "institution",
        },
      ],
    ]),
    items: itemsMap,
    sets: setsMap,
    sessions: new Map(),
    reports: new Map(),
    mistakes: new Map(),
    // demo 账户种子密码哈希(密码 = demo1234),不再"任意密码均可登录"。
    credentials: new Map<string, string>([
      ["demo-learner", hashPassword(DEMO_PASSWORD)],
      ["demo-reviewer", hashPassword(DEMO_PASSWORD)],
      ["demo-admin", hashPassword(DEMO_PASSWORD)],
    ]),
    // demo 付费账户的种子订阅,使 entitlement 在演示态也可验证。
    subscriptions: new Map<string, Subscription>([
      [
        "demo-learner",
        {
          userId: "demo-learner",
          plan: "pro",
          status: "active",
          updatedAt: new Date(0).toISOString(),
        },
      ],
      [
        "demo-reviewer",
        {
          userId: "demo-reviewer",
          plan: "institution",
          status: "active",
          updatedAt: new Date(0).toISOString(),
        },
      ],
      [
        "demo-admin",
        {
          userId: "demo-admin",
          plan: "institution",
          status: "active",
          updatedAt: new Date(0).toISOString(),
        },
      ],
    ]),
    auditLogs: [],
    snapshots: new Map(),
  };
}

function getStore() {
  globalThis.__HSK_PREP_STORE__ ??= createStore();
  return globalThis.__HSK_PREP_STORE__;
}

function matchSet(setIdOrSlug: string, set: PracticeSet) {
  return set.id === setIdOrSlug || set.slug === setIdOrSlug;
}

function scoreSection(items: ContentItem[], answers: Record<string, string>, sectionCode: "listening" | "reading") {
  const relevant = items.filter((item) => item.sectionCode === sectionCode);
  const correct = relevant.filter((item) => gradeResponse(item, answers[item.id]) === "correct").length;
  // total 只算可自动判分的题(主观书写/口语不计入分母)。
  const total = relevant.filter((item) => isAutoGradable(item)).length;
  return { sectionCode, correct, total };
}

export const mockRepository: Repository = {
  async getLevels() {
    return levels;
  },
  async getMockExams() {
    return [...getStore().sets.values()].filter((set) => set.mode === "mock_exam");
  },
  async getMockExamById(idOrSlug) {
    return [...getStore().sets.values()].find((set) => set.mode === "mock_exam" && matchSet(idOrSlug, set)) ?? null;
  },
  async getPracticeSets() {
    return [...getStore().sets.values()].filter((set) => set.mode === "practice_set");
  },
  async getPracticeSetById(idOrSlug) {
    return [...getStore().sets.values()].find((set) => set.mode === "practice_set" && matchSet(idOrSlug, set)) ?? null;
  },
  async getPublishedItemsForSet(setIdOrSlug) {
    const set = [...getStore().sets.values()].find((entry) => matchSet(setIdOrSlug, entry));
    if (!set) {
      return [];
    }
    return set.itemIds
      .map((id) => getStore().items.get(id))
      .filter((item): item is ContentItem => Boolean(item))
      .filter(
        (item) =>
          item.reviewStatus === "approved" &&
          item.publishStatus === "published" &&
          item.copyrightCleared &&
          item.sourceType !== "reference_only",
      );
  },
  async createSession({ userId, setIdOrSlug, mode }) {
    const set = [...getStore().sets.values()].find((entry) => matchSet(setIdOrSlug, entry));
    if (!set) {
      throw new Error("Set not found");
    }
    const session: ExamSession = {
      id: randomUUID(),
      userId,
      setId: set.id,
      setSlug: set.slug,
      mode,
      status: "active",
      startedAt: new Date().toISOString(),
      answers: {},
    };
    getStore().sessions.set(session.id, session);
    return session;
  },
  async getSession(sessionId) {
    return getStore().sessions.get(sessionId) ?? null;
  },
  async saveAnswer({ sessionId, itemId, optionId }) {
    const session = getStore().sessions.get(sessionId);
    if (!session) {
      return null;
    }
    session.answers[itemId] = optionId;
    getStore().sessions.set(sessionId, session);
    return session;
  },
  async submitSession(sessionId) {
    const session = getStore().sessions.get(sessionId);
    if (!session) {
      return null;
    }
    // H2 幂等去竞态:每会话至多一份报告。单进程 mock 无真并行,此同步检查即可
    // 模拟 DB 唯一约束 —— 已有报告(或会话已提交)直接返回既有报告,不重复评分。
    const existingReport = [...getStore().reports.values()].find(
      (r) => r.sessionId === sessionId,
    );
    if (existingReport) {
      return existingReport;
    }
    // 评分优先用快照(H3),无快照回退实时已发布题集(旧会话兼容)。
    const items =
      getStore().snapshots.get(sessionId) ??
      (await this.getPublishedItemsForSet(session.setId));
    // 按题型分流判分:主观题(write_*/speak)标 ungraded,不计入分母/错题。
    const graded = items.map((item) => ({
      item,
      outcome: gradeResponse(item, session.answers[item.id]),
    }));
    const gradable = graded.filter((g) => g.outcome !== "ungraded");
    const correct = gradable.filter((g) => g.outcome === "correct").length;
    const total = gradable.length;
    const report: ExamReport = {
      id: randomUUID(),
      sessionId: session.id,
      userId: session.userId,
      setSlug: session.setSlug,
      score: correct,
      total,
      accuracy: total ? correct / total : 0,
      durationSeconds: Math.max(
        60,
        Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000),
      ),
      mistakes: graded
        .filter((g) => g.outcome === "incorrect")
        .map(({ item }) => ({
          itemId: item.id,
          yourAnswer: session.answers[item.id] ?? null,
          correctAnswer: item.correctOptionId,
        })),
      sectionBreakdown: [
        scoreSection(items, session.answers, "listening"),
        scoreSection(items, session.answers, "reading"),
      ],
      // 多维报告:按 skill/sectionCode、题型、标签聚合(与 supabase 共用同一纯函数)。
      dimensions: computeReportDimensions(items, session.answers),
      createdAt: new Date().toISOString(),
    };

    session.status = "submitted";
    session.submittedAt = report.createdAt;
    getStore().sessions.set(session.id, session);
    getStore().reports.set(report.id, report);

    for (const mistake of report.mistakes) {
      // 优先用快照里的题(冻结态);快照内必有该题,回退实时题库。
      const item =
        items.find((i) => i.id === mistake.itemId) ??
        getStore().items.get(mistake.itemId);
      if (!item) continue;
      // 错题首次入库即初始化 SRS:dueAt = 今日(report.createdAt),easeFactor = 2.5。
      const srs = initialSrsState(report.createdAt);
      const entry: MistakeEntry = {
        id: randomUUID(),
        userId: session.userId,
        itemId: item.id,
        setSlug: session.setSlug,
        levelCode: item.levelCode,
        sectionCode: item.sectionCode,
        mastered: false,
        createdAt: report.createdAt,
        easeFactor: srs.easeFactor,
        intervalDays: srs.intervalDays,
        repetitions: srs.repetitions,
        dueAt: srs.dueAt,
        lastReviewedAt: srs.lastReviewedAt,
      };
      getStore().mistakes.set(entry.id, entry);
    }

    return report;
  },
  async getReport(reportId) {
    return getStore().reports.get(reportId) ?? null;
  },
  async saveSessionSnapshot(sessionId, items) {
    // 深拷贝冻结,避免快照引用被后续题库 mutation 影响(跨请求/HMR 在 globalThis 存活)。
    getStore().snapshots.set(
      sessionId,
      items.map((item) => structuredClone(item)),
    );
  },
  async getSessionSnapshot(sessionId) {
    return getStore().snapshots.get(sessionId) ?? null;
  },
  async findReportBySession(sessionId) {
    return (
      [...getStore().reports.values()].find((r) => r.sessionId === sessionId) ??
      null
    );
  },
  async getMistakes(userId) {
    return [...getStore().mistakes.values()].filter((item) => item.userId === userId);
  },
  async reviewMistake(userId, itemId, grade: ReviewGrade) {
    const entry = [...getStore().mistakes.values()].find(
      (m) => m.userId === userId && m.itemId === itemId,
    );
    if (!entry) {
      return null;
    }
    const srs = scheduleSrs(entry, grade);
    const next: MistakeEntry = {
      ...entry,
      easeFactor: srs.easeFactor,
      intervalDays: srs.intervalDays,
      repetitions: srs.repetitions,
      dueAt: srs.dueAt,
      lastReviewedAt: srs.lastReviewedAt,
      // easy 评分视为已掌握(与 SRS 推进一致的轻量约定)。
      mastered: grade === "easy" ? true : entry.mastered,
    };
    getStore().mistakes.set(entry.id, next);
    return next;
  },
  async getDueMistakes(userId) {
    const now = new Date().toISOString();
    return [...getStore().mistakes.values()].filter(
      (m) => m.userId === userId && !m.mastered && isMistakeDue(m, now),
    );
  },
  async getItem(itemId) {
    return getStore().items.get(itemId) ?? null;
  },
  async listAdminItems() {
    return [...getStore().items.values()].map<AdminListItem>((item) => ({
      id: item.id,
      title: item.title,
      levelCode: item.levelCode,
      sectionCode: item.sectionCode,
      questionTypeCode: item.questionTypeCode,
      reviewStatus: item.reviewStatus,
      publishStatus: item.publishStatus,
      sourceType: item.sourceType,
      copyrightCleared: item.copyrightCleared,
    }));
  },
  async patchAdminItem(itemId, patch) {
    const item = getStore().items.get(itemId);
    if (!item) {
      return null;
    }
    const next: ContentItem = {
      ...item,
      reviewStatus: patch.reviewStatus ?? item.reviewStatus,
      publishStatus: patch.publishStatus ?? item.publishStatus,
    };
    getStore().items.set(itemId, next);
    return next;
  },
  async createPracticeSet(input) {
    const set: PracticeSet = {
      ...input,
      id: input.id ?? randomUUID(),
    };
    getStore().sets.set(set.id, set);
    return set;
  },
  async patchPracticeSet(setIdOrSlug, patch) {
    const current = [...getStore().sets.values()].find((set) => matchSet(setIdOrSlug, set));
    if (!current) {
      return null;
    }
    const next = { ...current, ...patch };
    getStore().sets.set(current.id, next);
    return next;
  },
  async publishItem(itemId, publishStatus) {
    return this.patchAdminItem(itemId, { publishStatus });
  },
  async listUsers() {
    return [...getStore().users.values()];
  },
  async getUserById(userId) {
    return getStore().users.get(userId) ?? null;
  },
  async findUserByEmail(email) {
    return [...getStore().users.values()].find((user) => user.email === email) ?? null;
  },
  async upsertUser(user) {
    getStore().users.set(user.id, user);
    return user;
  },
  async getRole(userId) {
    const user = getStore().users.get(userId);
    return user?.role ?? "anonymous";
  },
  async getPasswordHash(userId) {
    return getStore().credentials.get(userId) ?? null;
  },
  async setPasswordHash(userId, passwordHash) {
    getStore().credentials.set(userId, passwordHash);
  },
  async getSubscription(userId) {
    return getStore().subscriptions.get(userId) ?? null;
  },
  async setSubscription(input) {
    const subscription: Subscription = {
      userId: input.userId,
      plan: input.plan,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      currentPeriodEndsAt: input.currentPeriodEndsAt ?? null,
      updatedAt: new Date().toISOString(),
    };
    getStore().subscriptions.set(input.userId, subscription);
    // entitlement 同步到 user.plan,使前端展示与门槛判断一致。
    const user = getStore().users.get(input.userId);
    if (user) {
      getStore().users.set(input.userId, {
        ...user,
        plan: input.status === "active" ? input.plan : "free",
      });
    }
    return subscription;
  },
  async addAuditLog(input) {
    getStore().auditLogs.push({
      id: randomUUID(),
      actorId: input.actorId,
      targetTable: input.targetTable,
      targetId: input.targetId,
      action: input.action,
      payload: input.payload ?? null,
      createdAt: new Date().toISOString(),
    });
  },
};
