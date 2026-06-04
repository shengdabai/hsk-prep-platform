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

export type Database = {
  public: {
    Tables: {
      profiles: { Row: AppUser };
      levels: { Row: LevelSummary };
      content_items: { Row: ContentItem };
      practice_sets: { Row: PracticeSet };
      exam_sessions: { Row: ExamSession };
      exam_reports: { Row: ExamReport };
      mistake_book: { Row: MistakeEntry };
    };
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
