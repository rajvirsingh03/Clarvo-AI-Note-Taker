-- Migration: sessions

create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null default 'Untitled Session',
  notes       text not null default '',
  state       text not null default 'COMPLETED'
    check (state in ('RECORDING','COMPLETED','POST_PROCESSING')),
  duration_seconds integer not null default 0,
  notion_page_id   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index sessions_user_id_idx on public.sessions(user_id);
create index sessions_created_at_idx on public.sessions(created_at desc);

alter table public.sessions enable row level security;

create policy "Users can CRUD their own sessions"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger sessions_updated_at
  before update on public.sessions
  for each row execute procedure public.set_updated_at();
