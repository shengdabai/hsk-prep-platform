export type TimestampedRow = {
  created_at: string;
  updated_at: string;
};

export type PlanRow = TimestampedRow & {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly_cents: number;
};

export type ProfileRow = TimestampedRow & {
  id: string;
  email: string;
  full_name: string | null;
  role: "learner" | "reviewer" | "admin";
  default_plan_code: string;
};

export type SubscriptionRow = TimestampedRow & {
  id: string;
  profile_id: string;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_ends_at: string | null;
};

export type LevelRow = TimestampedRow & {
  id: string;
  code: string;
  name: string;
  display_order: number;
  is_active: boolean;
};

export type SectionRow = TimestampedRow & {
  id: string;
  level_id: string;
  code: string;
  name: string;
  display_order: number;
  is_active: boolean;
};

export type QuestionTypeRow = TimestampedRow & {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

export type SourceDocumentFamilyRow = TimestampedRow & {
  id: string;
  family_code: string;
  title: string;
  notes: string | null;
};

export type SourceDocumentRow = TimestampedRow & {
  id: string;
  family_id: string | null;
  file_name: string;
  file_path: string | null;
  source_type: string;
  language: string | null;
};

export type SourcePageRow = TimestampedRow & {
  id: string;
  document_id: string;
  page_number: number;
  text_excerpt: string | null;
  image_path: string | null;
};

export type MediaAssetRow = TimestampedRow & {
  id: string;
  storage_bucket: string;
  storage_path: string;
  media_kind: string;
  mime_type: string | null;
  width_px: number | null;
  height_px: number | null;
};

export type ContentItemRow = TimestampedRow & {
  id: string;
  level_id: string;
  section_id: string;
  question_type_id: string;
  source_document_family_id: string | null;
  title: string;
  stem: string | null;
  prompt: string;
  explanation: string | null;
  review_status: string;
  publish_status: string;
  source_type: string;
  copyright_status: string;
  image_asset_id: string | null;
  audio_asset_id: string | null;
};

export type ContentItemOptionRow = TimestampedRow & {
  id: string;
  content_item_id: string;
  option_key: string;
  option_text: string;
  display_order: number;
};

export type ContentItemAnswerRow = TimestampedRow & {
  id: string;
  content_item_id: string;
  correct_option_id: string | null;
  answer_text: string | null;
  grading_strategy: string;
};

export type TagRow = TimestampedRow & {
  id: string;
  code: string;
  label: string;
};

export type ContentItemTagRow = TimestampedRow & {
  id: string;
  content_item_id: string;
  tag_id: string;
};

export type PracticeSetRow = TimestampedRow & {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  level_id: string;
  section_id: string | null;
  set_mode: "mock_exam" | "practice_set";
  access_plan_code: string;
  duration_minutes: number;
  review_status: string;
  publish_status: string;
};

export type PracticeSetItemRow = TimestampedRow & {
  id: string;
  practice_set_id: string;
  content_item_id: string;
  display_order: number;
};

export type ExamSessionRow = TimestampedRow & {
  id: string;
  profile_id: string;
  practice_set_id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
};

export type ExamSessionItemRow = TimestampedRow & {
  id: string;
  exam_session_id: string;
  content_item_id: string;
  display_order: number;
};

export type ExamResponseRow = TimestampedRow & {
  id: string;
  exam_session_id: string;
  content_item_id: string;
  selected_option_id: string | null;
  answer_text: string | null;
  is_correct: boolean | null;
  answered_at: string | null;
};

export type ExamReportRow = TimestampedRow & {
  id: string;
  exam_session_id: string;
  profile_id: string;
  total_questions: number;
  correct_answers: number;
  accuracy_rate: number;
  score: number;
  duration_seconds: number;
  report_json: Record<string, unknown>;
};

export type MistakeBookRow = TimestampedRow & {
  id: string;
  profile_id: string;
  content_item_id: string;
  first_seen_session_id: string | null;
  last_seen_at: string;
  mastered: boolean;
};

export type ReviewTaskRow = TimestampedRow & {
  id: string;
  content_item_id: string;
  assigned_to_profile_id: string | null;
  status: string;
  notes: string | null;
};

export type AuditLogRow = {
  id: string;
  actor_profile_id: string | null;
  target_table: string;
  target_id: string;
  action: string;
  payload_json: Record<string, unknown> | null;
  created_at: string;
};
