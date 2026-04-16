import type {
  AdminListItem,
  AppUser,
  ContentItem,
  ExamReport,
  ExamSession,
  LevelSummary,
  MistakeEntry,
  PracticeSet,
  ReviewStatus,
  PublishStatus,
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
  getMistakes(userId: string): Promise<MistakeEntry[]>;
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
};
