-- 004 — 错题本 SRS(SM-2 间隔重复)列
-- 目标:
--   为 public.mistake_book 增加 SM-2 间隔重复所需的列,使错题复习可按
--   ease_factor / interval_days / repetitions / due_at / last_reviewed_at 调度。
--   001 的 mistake_book 仅有 mastered / last_seen_at,缺 SRS 字段。
-- 语义对齐 @hsk/shared 的 srs.ts:
--   ease_factor 默认 2.5(下限 1.3),interval_days 起始 0,repetitions 起始 0,
--   due_at 首次入库 = 今日(now()),last_reviewed_at 首次 = now()。
-- 幂等:全部 add column if not exists + create index if not exists,可重复执行。

alter table public.mistake_book
  add column if not exists ease_factor numeric not null default 2.5;

alter table public.mistake_book
  add column if not exists interval_days integer not null default 0;

alter table public.mistake_book
  add column if not exists repetitions integer not null default 0;

alter table public.mistake_book
  add column if not exists due_at timestamptz not null default now();

alter table public.mistake_book
  add column if not exists last_reviewed_at timestamptz not null default now();

-- 取到期错题的查询走 (profile_id, mastered, due_at);补一个覆盖索引。
create index if not exists idx_mistake_book_due
  on public.mistake_book(profile_id, mastered, due_at);
