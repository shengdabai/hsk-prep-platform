import { randomUUID } from "node:crypto";

import {
  levels,
  sampleItems,
  sampleSets,
  type AdminListItem,
  type AppUser,
  type ContentItem,
  type ExamReport,
  type ExamSession,
  type MistakeEntry,
  type PracticeSet,
  type PublishStatus,
  type ReviewStatus,
  type UserRole,
} from "@hsk/shared";

import type { Repository } from "./types";

type Store = {
  users: Map<string, AppUser>;
  items: Map<string, ContentItem>;
  sets: Map<string, PracticeSet>;
  sessions: Map<string, ExamSession>;
  reports: Map<string, ExamReport>;
  mistakes: Map<string, MistakeEntry>;
};

declare global {
  // eslint-disable-next-line no-var
  var __HSK_PREP_STORE__: Store | undefined;
}

function createStore(): Store {
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
    items: new Map(sampleItems.map((item) => [item.id, item])),
    sets: new Map(sampleSets.map((set) => [set.id, set])),
    sessions: new Map(),
    reports: new Map(),
    mistakes: new Map(),
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
  const correct = relevant.filter((item) => answers[item.id] === item.correctOptionId).length;
  return { sectionCode, correct, total: relevant.length };
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
    const items = await this.getPublishedItemsForSet(session.setId);
    const correct = items.filter((item) => session.answers[item.id] === item.correctOptionId).length;
    const report: ExamReport = {
      id: randomUUID(),
      sessionId: session.id,
      userId: session.userId,
      setSlug: session.setSlug,
      score: correct,
      total: items.length,
      accuracy: items.length ? correct / items.length : 0,
      durationSeconds: Math.max(
        60,
        Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000),
      ),
      mistakes: items
        .filter((item) => session.answers[item.id] !== item.correctOptionId)
        .map((item) => ({
          itemId: item.id,
          yourAnswer: session.answers[item.id] ?? null,
          correctAnswer: item.correctOptionId,
        })),
      sectionBreakdown: [
        scoreSection(items, session.answers, "listening"),
        scoreSection(items, session.answers, "reading"),
      ],
      createdAt: new Date().toISOString(),
    };

    session.status = "submitted";
    session.submittedAt = report.createdAt;
    getStore().sessions.set(session.id, session);
    getStore().reports.set(report.id, report);

    for (const mistake of report.mistakes) {
      const item = getStore().items.get(mistake.itemId);
      if (!item) continue;
      const entry: MistakeEntry = {
        id: randomUUID(),
        userId: session.userId,
        itemId: item.id,
        setSlug: session.setSlug,
        levelCode: item.levelCode,
        sectionCode: item.sectionCode,
        mastered: false,
        createdAt: report.createdAt,
      };
      getStore().mistakes.set(entry.id, entry);
    }

    return report;
  },
  async getReport(reportId) {
    return getStore().reports.get(reportId) ?? null;
  },
  async getMistakes(userId) {
    return [...getStore().mistakes.values()].filter((item) => item.userId === userId);
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
};
