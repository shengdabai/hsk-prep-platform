create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  price_monthly_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'learner' check (role in ('learner', 'reviewer', 'admin')),
  default_plan_code text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  display_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id) on delete cascade,
  code text not null,
  name text not null,
  display_order integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(level_id, code)
);

create table if not exists public.question_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_document_families (
  id uuid primary key default gen_random_uuid(),
  family_code text not null unique,
  title text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.source_document_families(id) on delete set null,
  file_name text not null,
  file_path text,
  source_type text not null default 'json_import',
  language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.source_documents(id) on delete cascade,
  page_number integer not null,
  text_excerpt text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(document_id, page_number)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null,
  storage_path text not null,
  media_kind text not null default 'image',
  mime_type text,
  width_px integer,
  height_px integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(storage_bucket, storage_path)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete restrict,
  question_type_id uuid not null references public.question_types(id) on delete restrict,
  source_document_family_id uuid references public.source_document_families(id) on delete set null,
  title text not null,
  stem text,
  prompt text not null,
  explanation text,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected', 'needs_fix')),
  publish_status text not null default 'draft' check (publish_status in ('draft', 'ready', 'published', 'unpublished')),
  source_type text not null default 'original' check (source_type in ('reference_only', 're_authored', 'original')),
  copyright_status text not null default 'pending' check (copyright_status in ('pending', 'cleared')),
  image_asset_id uuid references public.media_assets(id) on delete set null,
  audio_asset_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_item_options (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  option_key text not null,
  option_text text not null,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_item_id, option_key)
);

create table if not exists public.content_item_answers (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null unique references public.content_items(id) on delete cascade,
  correct_option_id uuid references public.content_item_options(id) on delete set null,
  answer_text text,
  grading_strategy text not null default 'single_choice',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_item_tags (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(content_item_id, tag_id)
);

create table if not exists public.practice_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  level_id uuid not null references public.levels(id) on delete restrict,
  section_id uuid references public.sections(id) on delete set null,
  set_mode text not null check (set_mode in ('mock_exam', 'practice_set')),
  access_plan_code text not null default 'free',
  duration_minutes integer not null default 15,
  review_status text not null default 'approved' check (review_status in ('pending', 'approved', 'rejected', 'needs_fix')),
  publish_status text not null default 'published' check (publish_status in ('draft', 'ready', 'published', 'unpublished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_set_items (
  id uuid primary key default gen_random_uuid(),
  practice_set_id uuid not null references public.practice_sets(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(practice_set_id, content_item_id)
);

create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  practice_set_id uuid not null references public.practice_sets(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'submitted', 'cancelled')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_session_items (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references public.exam_sessions(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exam_session_id, content_item_id)
);

create table if not exists public.exam_responses (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null references public.exam_sessions(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  selected_option_id uuid references public.content_item_options(id) on delete set null,
  answer_text text,
  is_correct boolean,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exam_session_id, content_item_id)
);

create table if not exists public.exam_reports (
  id uuid primary key default gen_random_uuid(),
  exam_session_id uuid not null unique references public.exam_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  total_questions integer not null,
  correct_answers integer not null,
  accuracy_rate numeric(5,4) not null default 0,
  score integer not null default 0,
  duration_seconds integer not null default 0,
  report_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mistake_book (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  first_seen_session_id uuid references public.exam_sessions(id) on delete set null,
  last_seen_at timestamptz not null default now(),
  mastered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, content_item_id)
);

create table if not exists public.review_tasks (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_fix')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  target_table text not null,
  target_id text not null,
  action text not null,
  payload_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_content_items_status on public.content_items(review_status, publish_status);
create index if not exists idx_practice_sets_status on public.practice_sets(set_mode, publish_status);
create index if not exists idx_exam_sessions_profile on public.exam_sessions(profile_id, started_at desc);
create index if not exists idx_mistake_book_profile on public.mistake_book(profile_id, mastered);
create index if not exists idx_review_tasks_status on public.review_tasks(status, assigned_to_profile_id);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.content_items enable row level security;
alter table public.practice_sets enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.exam_responses enable row level security;
alter table public.exam_reports enable row level security;
alter table public.mistake_book enable row level security;
alter table public.review_tasks enable row level security;

create policy if not exists "profiles self read"
on public.profiles
for select
using (auth.uid() = id);

create policy if not exists "profiles self update"
on public.profiles
for update
using (auth.uid() = id);

create policy if not exists "published content read"
on public.content_items
for select
using (publish_status = 'published' and review_status = 'approved' and copyright_status = 'cleared');

create policy if not exists "published sets read"
on public.practice_sets
for select
using (publish_status = 'published' and review_status = 'approved');

create policy if not exists "sessions own read"
on public.exam_sessions
for select
using (auth.uid() = profile_id);

create policy if not exists "responses own read"
on public.exam_responses
for select
using (
  exists (
    select 1
    from public.exam_sessions s
    where s.id = exam_responses.exam_session_id
      and s.profile_id = auth.uid()
  )
);

create policy if not exists "reports own read"
on public.exam_reports
for select
using (auth.uid() = profile_id);

create policy if not exists "mistake book own read"
on public.mistake_book
for select
using (auth.uid() = profile_id);

create policy if not exists "review tasks reviewer admin"
on public.review_tasks
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('reviewer', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('reviewer', 'admin')
  )
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'plans',
    'profiles',
    'subscriptions',
    'levels',
    'sections',
    'question_types',
    'source_document_families',
    'source_documents',
    'source_pages',
    'media_assets',
    'content_items',
    'content_item_options',
    'content_item_answers',
    'tags',
    'content_item_tags',
    'practice_sets',
    'practice_set_items',
    'exam_sessions',
    'exam_session_items',
    'exam_responses',
    'exam_reports',
    'mistake_book',
    'review_tasks'
  ]
  loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s;', table_name);
    execute format('create trigger trg_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at();', table_name);
  end loop;
end $$;
