export type UserRole = "anonymous" | "learner" | "reviewer" | "admin";
export type PlanCode = "free" | "pro" | "institution";
export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_fix";
export type PublishStatus = "draft" | "ready" | "published" | "unpublished";
export type SourceType = "reference_only" | "re_authored" | "original";
export type LevelCode =
  | "hsk-1"
  | "hsk-2"
  | "hsk-3"
  | "hsk-4"
  | "hsk-5"
  | "hsk-6"
  | "hsk-7"
  | "hsk-8"
  | "hsk-9";
export type SectionCode = "listening" | "reading";
export type QuestionTypeCode =
  | "image_true_false"
  | "image_choice"
  | "single_choice"
  | "matching"
  | "fill_blank";

export type AppUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  plan: PlanCode;
};

export type LevelSummary = {
  id: string;
  code: LevelCode;
  name: string;
  title: string;
  status: "live" | "coming_soon";
  description: string;
};

export type SectionSummary = {
  id: string;
  code: SectionCode;
  name: string;
  levelCode: LevelCode;
  sortOrder: number;
};

export type QuestionOption = {
  id: string;
  label: string;
  text: string;
};

export type ContentItem = {
  id: string;
  levelCode: LevelCode;
  sectionCode: SectionCode;
  questionTypeCode: QuestionTypeCode;
  title: string;
  stem: string;
  prompt: string;
  explanation: string;
  reviewStatus: ReviewStatus;
  publishStatus: PublishStatus;
  sourceType: SourceType;
  copyrightCleared: boolean;
  options: QuestionOption[];
  correctOptionId: string;
  tags: string[];
};

export type PracticeSet = {
  id: string;
  slug: string;
  title: string;
  description: string;
  levelCode: LevelCode;
  mode: "mock_exam" | "practice_set";
  sectionCode?: SectionCode;
  access: PlanCode;
  minutes: number;
  itemIds: string[];
};

export type SessionQuestion = Omit<ContentItem, "correctOptionId">;

export type ExamSession = {
  id: string;
  userId: string;
  setId: string;
  setSlug: string;
  mode: "mock_exam" | "practice_set";
  status: "active" | "submitted";
  startedAt: string;
  submittedAt?: string;
  answers: Record<string, string>;
};

export type ExamReport = {
  id: string;
  sessionId: string;
  userId: string;
  setSlug: string;
  score: number;
  total: number;
  accuracy: number;
  durationSeconds: number;
  mistakes: Array<{
    itemId: string;
    yourAnswer: string | null;
    correctAnswer: string;
  }>;
  sectionBreakdown: Array<{
    sectionCode: SectionCode;
    correct: number;
    total: number;
  }>;
  createdAt: string;
};

export type MistakeEntry = {
  id: string;
  userId: string;
  itemId: string;
  setSlug: string;
  levelCode: LevelCode;
  sectionCode: SectionCode;
  mastered: boolean;
  createdAt: string;
};

export type AdminListItem = Pick<
  ContentItem,
  | "id"
  | "title"
  | "levelCode"
  | "sectionCode"
  | "questionTypeCode"
  | "reviewStatus"
  | "publishStatus"
  | "sourceType"
  | "copyrightCleared"
>;

export type ImportPayload = {
  items: Array<{
    id: string;
    title: string;
    stem: string;
    prompt: string;
    levelCode: LevelCode;
    sectionCode: SectionCode;
    questionTypeCode: QuestionTypeCode;
    explanation: string;
    reviewStatus: ReviewStatus;
    publishStatus: PublishStatus;
    sourceType: SourceType;
    copyrightCleared: boolean;
    options: QuestionOption[];
    correctOptionId: string;
    tags?: string[];
  }>;
  sets?: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    levelCode: LevelCode;
    mode: "mock_exam" | "practice_set";
    sectionCode?: SectionCode;
    access: PlanCode;
    minutes: number;
    itemIds: string[];
  }>;
};
