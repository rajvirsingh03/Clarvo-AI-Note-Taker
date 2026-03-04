-- Migration: screenshots
-- Stores base64 data URLs for screenshots captured during sessions.

create table if not exists public.screenshots (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  data_url   text not null,      -- base64 encoded image (data:image/...;base64,...)
  analysis   text,               -- Gemini Pro Vision analysis result
  created_at timestamptz not null default now()
);

create index screenshots_session_id_idx on public.screenshots(session_id);

alter table public.screenshots enable row level security;

create policy "Users can manage screenshots for their sessions"
  on public.screenshots for all
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
