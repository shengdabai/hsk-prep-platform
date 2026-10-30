-- Apply only after 001-007. Event receipt and all effects commit together.
create table if not exists public.stripe_events (
  event_id text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_created bigint not null,
  applied boolean not null default false
);
create index if not exists stripe_events_profile_created
  on public.stripe_events(profile_id, event_created desc) where applied;
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from public, anon, authenticated;
grant all on public.stripe_events to service_role;

create or replace function public.apply_stripe_event(
  p_event_id text, p_created bigint, p_user_id uuid, p_action text,
  p_subscription jsonb
) returns text
language plpgsql security invoker set search_path = public
as $$
declare
  v_plan_id uuid;
  v_subscription_id uuid;
  v_stripe_subscription_id text;
  v_latest bigint;
begin
  -- Serialize all subscription events for one user, including different event IDs.
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Stripe profile missing'; end if;
  insert into public.stripe_events(event_id, profile_id, event_created)
    values (p_event_id, p_user_id, p_created) on conflict do nothing;
  if not found then return 'duplicate'; end if;

  if p_subscription is not null then
    select max(event_created) into v_latest from public.stripe_events
      where profile_id = p_user_id and applied;
    if p_created < v_latest then return 'stale'; end if;
    if p_subscription->>'userId' is distinct from p_user_id::text or
       p_subscription->>'plan' not in ('free', 'pro', 'institution') or
       p_subscription->>'status' not in ('active', 'inactive', 'past_due', 'canceled') then
      raise exception 'Invalid Stripe subscription';
    end if;
    select id into v_plan_id from public.plans where code = p_subscription->>'plan';
    if v_plan_id is null then raise exception 'Stripe plan missing'; end if;
    select id, stripe_subscription_id into v_subscription_id, v_stripe_subscription_id
      from public.subscriptions
      where profile_id = p_user_id order by updated_at desc, id limit 1;
    -- Deleting an old subscription must not cancel a newer checkout for this user.
    if p_action = 'customer.subscription.deleted' and v_stripe_subscription_id is not null
       and v_stripe_subscription_id is distinct from p_subscription->>'stripeSubscriptionId' then
      return 'stale';
    end if;
    if v_subscription_id is null then
      insert into public.subscriptions(profile_id, plan_id) values (p_user_id, v_plan_id)
        returning id into v_subscription_id;
    end if;
    update public.subscriptions set
      plan_id = v_plan_id,
      status = p_subscription->>'status',
      stripe_customer_id = p_subscription->>'stripeCustomerId',
      stripe_subscription_id = p_subscription->>'stripeSubscriptionId',
      current_period_ends_at = (p_subscription->>'currentPeriodEndsAt')::timestamptz,
      updated_at = now()
    where id = v_subscription_id;
    update public.profiles set default_plan_code = case
      when p_subscription->>'status' = 'active' then p_subscription->>'plan'
      else 'free' end, updated_at = now() where id = p_user_id;
    update public.stripe_events set applied = true where event_id = p_event_id;
  end if;
  insert into public.audit_logs(actor_profile_id, target_table, target_id, action, payload_json)
    values (p_user_id, 'subscriptions', p_user_id::text, p_action,
      jsonb_build_object('eventId', p_event_id, 'plan', p_subscription->>'plan',
        'status', p_subscription->>'status'));
  return 'applied';
end;
$$;
revoke all on function public.apply_stripe_event(text, bigint, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_stripe_event(text, bigint, uuid, text, jsonb)
  to service_role;
