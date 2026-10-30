-- An event row exists only if all its database effects commit successfully.
-- Apply this migration before deploying the webhook which calls this RPC.
begin;
create table if not exists public.processed_stripe_events (
  event_id text primary key,
  completed_at timestamptz not null default now()
);
alter table public.processed_stripe_events enable row level security;
revoke all on public.processed_stripe_events from public, anon, authenticated;
grant select, insert on public.processed_stripe_events to service_role;

create or replace function public.apply_stripe_event(
  p_event_id text, p_subscription jsonb, p_audit jsonb
) returns boolean
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_user uuid;
  v_plan uuid;
  v_existing uuid;
  v_status text;
  v_plan_code text;
begin
  if p_event_id is null or length(trim(p_event_id)) = 0 then
    raise exception 'Stripe event id is required';
  end if;
  insert into public.processed_stripe_events(event_id) values (p_event_id)
    on conflict (event_id) do nothing;
  if not found then return false; end if;

  if p_subscription is not null and p_subscription <> 'null'::jsonb then
    if jsonb_typeof(p_subscription) <> 'object' then raise exception 'Invalid subscription'; end if;
    v_user := (p_subscription->>'userId')::uuid;
    v_plan_code := p_subscription->>'plan';
    v_status := p_subscription->>'status';
    if v_user is null or v_plan_code is null or v_status is null
       or v_status not in ('active','inactive','past_due','canceled') then
      raise exception 'Invalid subscription fields';
    end if;
    -- Serialize different event IDs for the same user without changing old data.
    perform 1 from public.profiles where id = v_user for update;
    if not found then raise exception 'Subscription profile missing'; end if;
    select id into v_plan from public.plans where code = v_plan_code;
    if not found then raise exception 'Unknown subscription plan'; end if;
    select id into v_existing from public.subscriptions where profile_id = v_user
      order by updated_at desc, id desc limit 1;
    if v_existing is null then
      insert into public.subscriptions(profile_id,plan_id,status,stripe_customer_id,stripe_subscription_id,current_period_ends_at)
      values (v_user,v_plan,v_status,p_subscription->>'stripeCustomerId',p_subscription->>'stripeSubscriptionId',(p_subscription->>'currentPeriodEndsAt')::timestamptz);
    else
      update public.subscriptions set plan_id=v_plan,status=v_status,
        stripe_customer_id=p_subscription->>'stripeCustomerId',
        stripe_subscription_id=p_subscription->>'stripeSubscriptionId',
        current_period_ends_at=(p_subscription->>'currentPeriodEndsAt')::timestamptz,
        updated_at=now() where id=v_existing;
    end if;
    update public.profiles set default_plan_code=case when v_status='active' then v_plan_code else 'free' end,
      updated_at=now() where id=v_user;
  end if;

  if p_audit is not null and p_audit <> 'null'::jsonb then
    if jsonb_typeof(p_audit) <> 'object' then raise exception 'Invalid audit'; end if;
    insert into public.audit_logs(actor_profile_id,target_table,target_id,action,payload_json)
    values ((p_audit->>'actorId')::uuid,p_audit->>'targetTable',p_audit->>'targetId',p_audit->>'action',p_audit->'payload');
  end if;
  return true;
end;
$$;
revoke all on function public.apply_stripe_event(text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.apply_stripe_event(text,jsonb,jsonb) to service_role;
commit;
