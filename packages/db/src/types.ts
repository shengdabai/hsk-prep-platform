import type {
  AdminListItem,
  AppUser,
  ContentItem,
  ExamReport,
  ExamSession,
  LevelSummary,
  MistakeEntry,
  PracticeSet,
  ReviewGrade,
  ReviewStatus,
  PublishStatus,
  Subscription,
  SubscriptionStatus,
  UserRole,
} from "@hsk/shared";

import type {
  AuditLogRow,
  ContentItemAnswerRow,
  ContentItemOptionRow,
  ContentItemRow,
  ContentItemTagRow,
  ExamReportRow,
  ExamResponseRow,
  ExamSessionItemRow,
  ExamSessionRow,
  LevelRow,
  MediaAssetRow,
  MistakeBookRow,
  PlanRow,
  PracticeSetItemRow,
  PracticeSetRow,
  ProfileRow,
  QuestionTypeRow,
  ReviewTaskRow,
  SectionRow,
  SourceDocumentFamilyRow,
  SourceDocumentRow,
  SourcePageRow,
  SubscriptionRow,
  TagRow,
} from "./schema";

export type TableName =
  | "profiles"
  | "plans"
  | "subscriptions"
  | "levels"
  | "sections"
  | "question_types"
  | "source_document_families"
  | "source_documents"
  | "source_pages"
  | "media_assets"
  | "content_items"
  | "content_item_options"
  | "content_item_answers"
  | "tags"
  | "content_item_tags"
  | "practice_sets"
  | "practice_set_items"
  | "exam_sessions"
  | "exam_session_items"
  | "exam_responses"
  | "exam_reports"
  | "mistake_book"
  | "review_tasks"
  | "audit_logs";

// 精确手写的 supabase Database 类型(无 key 无法跑 `supabase gen types`,按 infra/sql
// schema 与本仓 schema.ts 的 snake_case Row 手写)。取代此前把领域类型(camelCase)
// 误当 Row 的死类型 —— 那让 supabase client 放弃列级类型、逼出 11 处 `as unknown`。
// 现在 .from(table) 直接拿到列级 Row/Insert/Update 校验,消除 DB 边界的盲 cast。
//
// Insert:id / 时间戳 / 带默认值的列设为 optional(由 DB 默认值生成);
// Update:全列 Partial(只改提供的列)。

// 取出 Row 中类型含 null 的列名 —— 这些列在 schema 里要么 nullable、要么有 DB 默认值,
// INSERT 时可省略(与 supabase gen types 的 Insert 语义一致)。
type NullableKeys<Row> = {
  [K in keyof Row]-?: null extends Row[K] ? K : never;
}[keyof Row];

// INSERT 时可省略的列名(由 DB 默认值/序列生成)。涵盖:主键 + 审计时间戳 + 会话起始
// 时间 + 各表带 `default`/`check ... default` 的非空列(与 infra/sql 的 DDL 默认值一致)。
// 这是手写 Database 对 `supabase gen types`「有默认值列在 Insert 上为 optional」语义的复刻。
type DefaultedKeys =
  | "id"
  | "created_at"
  | "updated_at"
  | "started_at"
  // 状态/审阅/发布/版权(均带 default)。
  | "review_status"
  | "publish_status"
  | "source_type"
  | "copyright_status"
  | "status"
  // 顺序 / 计划 / 时长(均带 default)。
  | "display_order"
  | "access_plan_code"
  | "duration_minutes"
  // 错题本 + SRS 列(004 默认值)。
  | "mastered"
  | "last_seen_at"
  | "ease_factor"
  | "interval_days"
  | "repetitions"
  | "due_at"
  | "last_reviewed_at"
  // 报告统计列(001 默认值)。
  | "accuracy_rate"
  | "score"
  | "duration_seconds"
  | "report_json"
  // 维度表激活标记。
  | "is_active";

// Insert 形状:必填 = 非 null 且无默认值列;optional = nullable 列 + 带默认值列。
type DbInsert<Row> = Omit<Row, NullableKeys<Row> | (keyof Row & DefaultedKeys)> &
  Partial<Pick<Row, (NullableKeys<Row> | (keyof Row & DefaultedKeys)) & keyof Row>>;

type Table<Row> = {
  Row: Row;
  Insert: DbInsert<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      plans: Table<PlanRow>;
      profiles: Table<ProfileRow>;
      subscriptions: Table<SubscriptionRow>;
      levels: Table<LevelRow>;
      sections: Table<SectionRow>;
      question_types: Table<QuestionTypeRow>;
      source_document_families: Table<SourceDocumentFamilyRow>;
      source_documents: Table<SourceDocumentRow>;
      source_pages: Table<SourcePageRow>;
      media_assets: Table<MediaAssetRow>;
      content_items: Table<ContentItemRow>;
      content_item_options: Table<ContentItemOptionRow>;
      content_item_answers: Table<ContentItemAnswerRow>;
      tags: Table<TagRow>;
      content_item_tags: Table<ContentItemTagRow>;
      practice_sets: Table<PracticeSetRow>;
      practice_set_items: Table<PracticeSetItemRow>;
      exam_sessions: Table<ExamSessionRow>;
      exam_session_items: Table<ExamSessionItemRow>;
      exam_responses: Table<ExamResponseRow>;
      exam_reports: Table<ExamReportRow>;
      mistake_book: Table<MistakeBookRow>;
      review_tasks: Table<ReviewTaskRow>;
      audit_logs: Table<Omit<AuditLogRow, "created_at"> & { created_at?: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      submit_exam_session: {
        Args: {
          p_session_id: string;
          p_profile_id: string;
          p_total: number;
          p_correct: number;
          p_accuracy: number;
          p_duration: number;
          p_report_json: Record<string, unknown>;
          p_submitted_at: string;
          p_mistakes: Array<{ itemId: string }>;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Repository = {
  getLevels(): Promise<LevelSummary[]>;
  getMockExams(): Promise<PracticeSet[]>;
  getMockExamById(idOrSlug: string): Promise<PracticeSet | null>;
  getPracticeSets(): Promise<PracticeSet[]>;
  getPracticeSetById(idOrSlug: string): Promise<PracticeSet | null>;
  getPublishedItemsForSet(setIdOrSlug: string): Promise<ContentItem[]>;
  createSession(input: {
    userId: string;
    setIdOrSlug: string;
    mode: "mock_exam" | "practice_set";
  }): Promise<ExamSession>;
  getSession(sessionId: string): Promise<ExamSession | null>;
  saveAnswer(input: {
    sessionId: string;
    itemId: string;
    optionId: string;
  }): Promise<ExamSession | null>;
  submitSession(sessionId: string): Promise<ExamReport | null>;
  getReport(reportId: string): Promise<ExamReport | null>;

  // ── 评分快照(H3 持久化)──────────────────────────────────────────────────
  // 会话创建时冻结本套卷题目(含 correctOptionId / answerText),与 sessionId 绑定持久化。
  // 评分与渲染只读快照,与题库后续编辑/重新发布解耦。serverless 跨实例/冷启动可读回。
  saveSessionSnapshot(sessionId: string, items: ContentItem[]): Promise<void>;
  // 取该会话的快照题目;无快照(旧会话 / 从未冻结)返回 null。
  getSessionSnapshot(sessionId: string): Promise<ContentItem[] | null>;

  // ── submit 幂等(H2 去竞态)────────────────────────────────────────────────
  // 按 sessionId 反查既有报告(每会话至多一份,DB 唯一约束兜底)。
  // 并发 submit 时后者据此回退到既有 report,而非生成第二份。
  findReportBySession(sessionId: string): Promise<ExamReport | null>;
  getMistakes(userId: string): Promise<MistakeEntry[]>;
  // SRS 复习:按 SM-2 评分推进一条错题的调度,返回更新后的错题(不存在返回 null)。
  reviewMistake(
    userId: string,
    itemId: string,
    grade: ReviewGrade,
  ): Promise<MistakeEntry | null>;
  // SRS 取到期错题(dueAt <= now;无 dueAt 的旧数据视为已到期)。
  getDueMistakes(userId: string): Promise<MistakeEntry[]>;
  getItem(itemId: string): Promise<ContentItem | null>;
  listAdminItems(): Promise<AdminListItem[]>;
  patchAdminItem(itemId: string, patch: {
    reviewStatus?: ReviewStatus;
    publishStatus?: PublishStatus;
  }): Promise<ContentItem | null>;
  createPracticeSet(input: Omit<PracticeSet, "id"> & { id?: string }): Promise<PracticeSet>;
  patchPracticeSet(setIdOrSlug: string, patch: Partial<PracticeSet>): Promise<PracticeSet | null>;
  publishItem(itemId: string, publishStatus: PublishStatus): Promise<ContentItem | null>;
  listUsers(): Promise<AppUser[]>;
  getUserById(userId: string): Promise<AppUser | null>;
  findUserByEmail(email: string): Promise<AppUser | null>;
  upsertUser(user: AppUser): Promise<AppUser>;
  getRole(userId: string): Promise<UserRole>;

  // 凭据(密码哈希由调用方计算并存取,repository 不感知明文)。
  getPasswordHash(userId: string): Promise<string | null>;
  setPasswordHash(userId: string, passwordHash: string): Promise<void>;

  // 订阅 / entitlement。
  getSubscription(userId: string): Promise<Subscription | null>;
  setSubscription(input: {
    userId: string;
    plan: Subscription["plan"];
    status: SubscriptionStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodEndsAt?: string | null;
  }): Promise<Subscription>;

  // 审计日志:敏感写操作落痕。
  addAuditLog(input: {
    actorId: string | null;
    targetTable: string;
    targetId: string;
    action: string;
    payload?: Record<string, unknown> | null;
  }): Promise<void>;
};
