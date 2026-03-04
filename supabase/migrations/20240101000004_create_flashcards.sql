-- Migration: flashcards

create table if not exists public.flashcards (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  front      text not null,
  back       text not null,
  created_at timestamptz not null default now()
);

create index flashcards_session_id_idx on public.flashcards(session_id);

alter table public.flashcards enable row level security;

create policy "Users can manage flashcards for their sessions"
  on public.flashcards for all
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
