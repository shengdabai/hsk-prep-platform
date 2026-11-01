-- psql -v ON_ERROR_STOP=1 -f infra/sql/tests/008_stripe_event_transaction.test.sql
-- Run ONLY as the owner of an EMPTY disposable database. All changes roll back.
-- Minimal schema fixture mirrors the columns used from migrations 001-007.
begin;
do $$ begin
  if not exists(select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
end $$;
create table public.profiles (
  id uuid primary key, email text not null unique,
  default_plan_code text not null default 'free', updated_at timestamptz default now()
);
create table public.plans (
  id uuid primary key default gen_random_uuid(), code text unique not null, name text not null
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id),
  plan_id uuid references public.plans(id), status text not null default 'inactive',
  stripe_customer_id text, stripe_subscription_id text, current_period_ends_at timestamptz,
  updated_at timestamptz default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_profile_id uuid references public.profiles(id),
  target_table text not null, target_id text not null, action text not null, payload_json jsonb
);
\ir ../008_stripe_event_transaction.sql
\ir ../008_stripe_event_transaction.sql
create function public.fixture_reject_audit() returns trigger language plpgsql as $$
begin
  if new.action = 'fixture_audit_failure' then
    raise exception 'Fixture audit failure' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger fixture_reject_audit before insert on public.audit_logs
  for each row execute function public.fixture_reject_audit();
grant all on public.profiles, public.plans, public.subscriptions, public.audit_logs to service_role;
set local role service_role;
do $$
declare
  v_user uuid := gen_random_uuid();
  v_event text := 'fixture_' || gen_random_uuid()::text;
  v_payload jsonb;
  v_result text;
  v_count bigint;
begin
  insert into public.profiles(id, email) values (v_user, 'fixture_' || v_user::text);
  insert into public.plans(code, name) values ('pro', 'Fixture') on conflict (code) do nothing;
  insert into public.plans(code, name) values ('free', 'Fixture') on conflict (code) do nothing;
  v_payload := jsonb_build_object('userId', v_user::text, 'plan', 'pro',
    'status', 'active', 'stripeSubscriptionId', 'sub_fixture');

  -- Failure in the final write must undo the earlier entitlement changes too.
  begin
    perform public.apply_stripe_event(v_event, 200, v_user, 'fixture_audit_failure', v_payload);
    raise exception 'Expected audit failure';
  exception when check_violation then null;
  end;
  if exists(select 1 from public.stripe_events where event_id = v_event) or
     exists(select 1 from public.subscriptions where profile_id = v_user) or
     (select default_plan_code from public.profiles where id = v_user) <> 'free' then
    raise exception 'Audit failure leaked subscription effects';
  end if;
  -- A business failure must roll back receipt, subscription, profile and audit.
  begin
    perform public.apply_stripe_event(v_event, 200, v_user, 'fixture',
      v_payload || '{"currentPeriodEndsAt":"invalid timestamp"}'::jsonb);
    raise exception 'Expected invalid timestamp failure';
  exception when invalid_datetime_format then null;
  end;
  if exists(select 1 from public.stripe_events where event_id = v_event) or
     exists(select 1 from public.subscriptions where profile_id = v_user) or
     exists(select 1 from public.audit_logs where actor_profile_id = v_user) or
     (select default_plan_code from public.profiles where id = v_user) <> 'free' then
    raise exception 'Failure leaked partial effects';
  end if;
  -- Retry the exact same event ID successfully.
  v_result := public.apply_stripe_event(v_event, 200, v_user, 'fixture', v_payload);
  if v_result <> 'applied' or
     (select default_plan_code from public.profiles where id = v_user) <> 'pro' then
    raise exception 'Retry failed to grant entitlement';
  end if;
  if public.apply_stripe_event(v_event, 200, v_user, 'fixture', v_payload) <> 'duplicate' then
    raise exception 'Duplicate was applied';
  end if;
  select count(*) into v_count from public.audit_logs where actor_profile_id = v_user;
  if v_count <> 1 then raise exception 'Duplicate audit rows'; end if;

  -- A newer cancellation must survive an older active event arriving later.
  perform public.apply_stripe_event(v_event || '_cancel', 300, v_user,
    'customer.subscription.deleted', v_payload || '{"plan":"free","status":"canceled"}'::jsonb);
  if public.apply_stripe_event(v_event || '_old', 100, v_user, 'fixture', v_payload) <> 'stale' or
     (select default_plan_code from public.profiles where id = v_user) <> 'free' then
    raise exception 'Old event overwrote cancellation';
  end if;
  -- Audit-only unknown prices do not advance the entitlement ordering cursor.
  perform public.apply_stripe_event(v_event || '_unknown', 500, v_user, 'unmapped', null);
  if public.apply_stripe_event(v_event || '_new', 400, v_user, 'fixture', v_payload) <> 'applied' then
    raise exception 'Audit-only event suppressed a valid subscription';
  end if;
  if public.apply_stripe_event(v_event || '_old_sub', 600, v_user, 'customer.subscription.deleted',
       v_payload || '{"stripeSubscriptionId":"sub_old","plan":"free","status":"canceled"}'::jsonb) <> 'stale' or
     (select default_plan_code from public.profiles where id = v_user) <> 'pro' then
    raise exception 'Old subscription cancellation revoked a newer subscription';
  end if;
  if has_function_privilege('anon', 'public.apply_stripe_event(text,bigint,uuid,text,jsonb)', 'EXECUTE') or
     has_function_privilege('authenticated', 'public.apply_stripe_event(text,bigint,uuid,text,jsonb)', 'EXECUTE') or
     not has_function_privilege('service_role', 'public.apply_stripe_event(text,bigint,uuid,text,jsonb)', 'EXECUTE') then
    raise exception 'Webhook RPC grants are incorrect';
  end if;
end;
$$;
rollback;
