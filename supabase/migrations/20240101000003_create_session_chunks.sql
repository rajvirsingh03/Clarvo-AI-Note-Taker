-- Migration: session_chunks
-- Raw transcript chunks captured in 25-second intervals by the extension.

create table if not exists public.session_chunks (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  transcript  text not null,
  chunk_index integer not null,
  created_at  timestamptz not null default now()
);

create index session_chunks_session_id_idx on public.session_chunks(session_id);
create index session_chunks_chunk_index_idx on public.session_chunks(session_id, chunk_index);

alter table public.session_chunks enable row level security;

-- Users can only access chunks for sessions they own
create policy "Users can manage chunks for their sessions"
  on public.session_chunks for all
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
