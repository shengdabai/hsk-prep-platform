-- 006 — 评分快照持久化 + submit 幂等去竞态(终审 H2 / H3)
-- 目标:
--   H3 评分快照持久化:会话创建时把本套卷题目(含 correctOptionId / answerText /
--     题型 / 媒体直链)冻结成快照,与 sessionId 绑定,落 DB。submit 评分与 GET 渲染
--     只读快照,与题库后续编辑/重新发布解耦。原实现把快照存进程内存(globalThis Map),
--     Vercel serverless 跨实例/冷启动即丢,快照机制形同未实现 —— 改为 DB 持久化。
--   H2 submit 幂等去竞态:exam_reports.exam_session_id 已是 UNIQUE(001),
--     本迁移补一个唯一约束的显式命名(若 001 已带匿名唯一约束则保持不变),
--     使 submitSession 可依赖 onConflict + unique violation 回退到既有 report,
--     消除「两并发 submit 各生成一份 report」的竞态窗口。
--
-- 设计:复用 001 已建的 public.exam_session_items 表(原仅 display_order),
--   为其增加 snapshot_json(jsonb)列,逐题存冻结的领域 ContentItem。
--   一行 = 一道快照题;(exam_session_id, content_item_id) 已唯一(001),
--   display_order 保持卷面顺序。读回时按 display_order 还原快照题集。
--
-- 幂等:add column if not exists + create index if not exists,可重复执行。

-- ── H3:快照列 ───────────────────────────────────────────────────────────────
-- snapshot_json 存冻结的领域 ContentItem(含 correctOptionId / answerText /
-- questionTypeCode / imageUrl / audioUrl 等评分与渲染必需字段)。
alter table public.exam_session_items
  add column if not exists snapshot_json jsonb not null default '{}'::jsonb;

-- 按会话取快照题集走 (exam_session_id, display_order);补覆盖索引。
create index if not exists idx_exam_session_items_session
  on public.exam_session_items(exam_session_id, display_order);

-- ── H2:submit 幂等的唯一约束兜底 ────────────────────────────────────────────
-- 001 已对 exam_reports.exam_session_id 声明 UNIQUE(列内联 unique)。
-- 这里幂等地确保该唯一约束存在(若库由非 001 路径建表而缺失则补建),
-- 使每个会话至多一份报告 —— 两并发 submit 时,后者命中唯一冲突,
-- 应用层回退读既有报告,而非生成第二份。
do $$
begin
  if not exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'exam_reports'
      and con.contype = 'u'
      and con.conkey = array[
        (select attnum from pg_attribute
         where attrelid = 'public.exam_reports'::regclass
           and attname = 'exam_session_id')
      ]
  ) then
    alter table public.exam_reports
      add constraint exam_reports_exam_session_id_key unique (exam_session_id);
  end if;
end $$;

-- exam_session_items 启用 RLS,与 001 其余学生数据表一致(自身会话可读)。
alter table public.exam_session_items enable row level security;

create policy if not exists "session items own read"
on public.exam_session_items
for select
using (
  exists (
    select 1
    from public.exam_sessions s
    where s.id = exam_session_items.exam_session_id
      and s.profile_id = auth.uid()
  )
);
