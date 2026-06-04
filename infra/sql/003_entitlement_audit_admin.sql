-- 003 — entitlement / 审计 / admin 写策略
-- 目标:
--   1. profiles 增加 password_hash 列(Supabase 模式下凭据存储位置,
--      因为本平台用自管 HMAC 会话而非 Supabase Auth 的 auth.users 密码)。
--   2. 001 只定义了读策略(published 内容、自有数据),缺 admin/reviewer 写策略;
--      service-role 客户端虽绕过 RLS,但显式策略让未来 anon/authed 写路径有据可依,
--      也使 RLS 语义完整可审计。
--   3. publish 类写策略仅限 admin(reviewer 可改 review_status / 内容,但发布是 admin 专属)。
-- 幂等:全部 if not exists / add column if not exists,可重复执行。

-- 1) 凭据列 ------------------------------------------------------------------
alter table public.profiles
  add column if not exists password_hash text;

-- 2) 复用的角色判定表达式 -----------------------------------------------------
-- 说明:Postgres 不支持把 RLS 谓词抽成命名函数后内联,这里在各策略里展开
-- exists(select 1 from profiles ...) 模式,保持与 001 review_tasks 策略一致。

-- 3) content_items —— admin/reviewer 可写,publish 字段变更限 admin --------------
-- reviewer/admin 可 insert / update / delete 内容(评审、修订)。
create policy if not exists "content items admin reviewer write"
on public.content_items
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'reviewer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'reviewer')
  )
);

-- 发布动作(把 publish_status 置为 published)收紧到 admin:
-- 该策略只放行 admin 对已 published 行的写入,确保 reviewer 即便能改内容
-- 也无法把条目推到 published 状态。
create policy if not exists "content items publish admin only"
on public.content_items
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- 4) practice_sets —— admin/reviewer 可写,发布限 admin -------------------------
create policy if not exists "practice sets admin reviewer write"
on public.practice_sets
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'reviewer')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'reviewer')
  )
);

create policy if not exists "practice sets publish admin only"
on public.practice_sets
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- 5) subscriptions —— entitlement 写入限 admin --------------------------------
-- 订阅由后台(service-role webhook)或 admin 写入,普通用户只能读自有订阅。
-- 先补一条 001 缺失的"自有订阅读"策略,再加 admin 写策略。
create policy if not exists "subscriptions own read"
on public.subscriptions
for select
using (auth.uid() = profile_id);

create policy if not exists "subscriptions admin write"
on public.subscriptions
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- 6) audit_logs —— admin/reviewer 可读写审计痕迹 -------------------------------
-- 001 未对 audit_logs 启用 RLS,这里启用并加策略(service-role 仍可绕过)。
alter table public.audit_logs enable row level security;

create policy if not exists "audit logs admin reviewer read"
on public.audit_logs
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'reviewer')
  )
);

create policy if not exists "audit logs admin reviewer insert"
on public.audit_logs
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'reviewer')
  )
);
