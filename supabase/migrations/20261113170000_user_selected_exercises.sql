create table if not exists public.user_selected_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catalog_exercise_id text not null,
  exercise_name text not null,
  muscle_group text not null,
  equipment text not null default 'Sem equipamento',
  level text not null default 'Iniciante',
  sets smallint not null default 3 check (sets between 1 and 20),
  reps text not null default '10' check (char_length(reps) between 1 and 20),
  rest_sec smallint not null default 60 check (rest_sec between 0 and 600),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_selected_exercises_catalog_id_check
    check (catalog_exercise_id ~ '^[a-z0-9-]{1,80}$'),
  constraint user_selected_exercises_level_check
    check (level in ('Iniciante', 'Intermediário', 'Avançado')),
  constraint user_selected_exercises_name_check
    check (char_length(exercise_name) between 1 and 100),
  constraint user_selected_exercises_muscle_group_check
    check (char_length(muscle_group) between 1 and 60),
  constraint user_selected_exercises_equipment_check
    check (char_length(equipment) between 1 and 60),
  constraint user_selected_exercises_user_catalog_unique
    unique (user_id, catalog_exercise_id)
);

create index if not exists user_selected_exercises_user_created_idx
  on public.user_selected_exercises (user_id, created_at desc);

alter table public.user_selected_exercises enable row level security;
revoke all on public.user_selected_exercises from anon;
grant select, insert, update, delete on public.user_selected_exercises to authenticated;

drop policy if exists "Users read their selected exercises" on public.user_selected_exercises;
create policy "Users read their selected exercises"
  on public.user_selected_exercises for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their selected exercises" on public.user_selected_exercises;
create policy "Users insert their selected exercises"
  on public.user_selected_exercises for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their selected exercises" on public.user_selected_exercises;
create policy "Users update their selected exercises"
  on public.user_selected_exercises for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their selected exercises" on public.user_selected_exercises;
create policy "Users delete their selected exercises"
  on public.user_selected_exercises for delete to authenticated
  using ((select auth.uid()) = user_id);
