create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  categories jsonb not null default '{"workouts":true,"weeklyPlan":true,"achievements":false,"lives":false}'::jsonb,
  time_zone text not null default 'America/Sao_Paulo',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint web_push_categories_object check (jsonb_typeof(categories) = 'object')
);

create index if not exists web_push_subscriptions_user_active_idx
  on public.web_push_subscriptions (user_id, active);

alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from anon;
grant select, insert, update, delete on public.web_push_subscriptions to authenticated;

drop policy if exists "Users read their own push subscriptions" on public.web_push_subscriptions;
create policy "Users read their own push subscriptions"
  on public.web_push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their own push subscriptions" on public.web_push_subscriptions;
create policy "Users insert their own push subscriptions"
  on public.web_push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own push subscriptions" on public.web_push_subscriptions;
create policy "Users update their own push subscriptions"
  on public.web_push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own push subscriptions" on public.web_push_subscriptions;
create policy "Users delete their own push subscriptions"
  on public.web_push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.push_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  activity_id text not null,
  category text not null default 'weeklyPlan' check (category = 'weeklyPlan'),
  title text not null,
  body text not null,
  target_url text not null,
  scheduled_at timestamptz not null,
  time_zone text not null default 'America/Sao_Paulo',
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz,
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

create index if not exists push_reminders_due_idx
  on public.push_reminders (status, scheduled_at, next_attempt_at);
create index if not exists push_reminders_user_idx
  on public.push_reminders (user_id, scheduled_at);

alter table public.push_reminders enable row level security;
revoke all on public.push_reminders from anon;
grant select on public.push_reminders to authenticated;

drop policy if exists "Users read their own push reminders" on public.push_reminders;
create policy "Users read their own push reminders"
  on public.push_reminders for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.claim_due_push_reminders(p_limit integer default 50)
returns setof public.push_reminders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.push_reminders
  set status = 'failed',
      last_error = 'Limite de tentativas atingido após claim expirado',
      claimed_at = null
  where status = 'processing'
    and attempts >= 5
    and claimed_at < now() - interval '10 minutes';

  return query
  with due as (
    select r.id
    from public.push_reminders as r
    where (r.status = 'pending' and r.attempts < 5 and coalesce(r.next_attempt_at, r.scheduled_at) <= now())
       or (r.status = 'processing' and r.attempts < 5 and r.claimed_at < now() - interval '10 minutes')
    order by r.scheduled_at asc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
    for update skip locked
  )
  update public.push_reminders as r
  set status = 'processing',
      claimed_at = now(),
      attempts = r.attempts + 1,
      last_error = null
  from due
  where r.id = due.id
  returning r.*;
end;
$$;

create or replace function public.replace_weekly_push_reminders(p_user_id uuid, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 7 then
    raise exception 'Invalid weekly reminder batch';
  end if;

  delete from public.push_reminders
  where user_id = p_user_id
    and status = 'pending'
    and scheduled_at > now();

  insert into public.push_reminders (
    user_id, activity_date, activity_id, category, title, body, target_url,
    scheduled_at, time_zone, status, attempts, next_attempt_at, claimed_at, sent_at, last_error
  )
  select
    p_user_id,
    (entry ->> 'activity_date')::date,
    entry ->> 'activity_id',
    'weeklyPlan',
    entry ->> 'title',
    entry ->> 'body',
    entry ->> 'target_url',
    (entry ->> 'scheduled_at')::timestamptz,
    entry ->> 'time_zone',
    'pending',
    0,
    null,
    null,
    null,
    null
  from jsonb_array_elements(p_rows) as entries(entry)
  on conflict (user_id, activity_date) do update
    set activity_id = excluded.activity_id,
        category = excluded.category,
        title = excluded.title,
        body = excluded.body,
        target_url = excluded.target_url,
        scheduled_at = excluded.scheduled_at,
        time_zone = excluded.time_zone,
        status = 'pending',
        attempts = 0,
        next_attempt_at = null,
        claimed_at = null,
        sent_at = null,
        last_error = null
    where public.push_reminders.status not in ('processing', 'sent');

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.claim_due_push_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_push_reminders(integer) to service_role;
revoke all on function public.replace_weekly_push_reminders(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_weekly_push_reminders(uuid, jsonb) to service_role;
