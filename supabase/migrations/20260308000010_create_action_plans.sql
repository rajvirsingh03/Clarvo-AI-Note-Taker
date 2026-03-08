-- Migration: action_plans

create table if not exists public.action_plans (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index action_plans_session_id_idx on public.action_plans(session_id);

alter table public.action_plans enable row level security;

create policy "Users can manage action plans for their sessions"
  on public.action_plans for all
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );
