-- 005 — profiles.id 独立主键(去掉 auth.users 外键)
-- 目标:
--   001 早期把 profiles.id 外键到 auth.users(id)。本平台用自建 HMAC 会话
--   (apps/web/lib/session.ts),不接 Supabase Auth,该外键会让「无 Supabase Auth
--   用户」时根本无法插入 profiles,与自建 user id 体系冲突。
--   本迁移在已应用旧 001 的库上幂等地移除该外键,使 profiles.id 成为独立主键
--   (default gen_random_uuid(),亦可接受应用层传入 id)。
-- 幂等:动态查实际外键名后 drop（约束名可能随建库方式不同），可重复执行。

do $$
declare
  fk_name text;
begin
  -- 找出 profiles.id 指向 auth.users 的外键约束名(若存在)。
  select con.conname
    into fk_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  join pg_class fref on fref.oid = con.confrelid
  join pg_namespace fnsp on fnsp.oid = fref.relnamespace
  where con.contype = 'f'
    and nsp.nspname = 'public'
    and rel.relname = 'profiles'
    and fnsp.nspname = 'auth'
    and fref.relname = 'users'
  limit 1;

  if fk_name is not null then
    execute format('alter table public.profiles drop constraint %I;', fk_name);
  end if;
end $$;

-- 确保 id 有默认值(独立生成),不依赖外部 auth.users 行先存在。
alter table public.profiles
  alter column id set default gen_random_uuid();
