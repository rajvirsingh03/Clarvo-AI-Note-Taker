-- Migration: quiz_questions
-- Stores LLM-generated MCQ quiz questions per session,
-- with optional persisted user answers for review.

create table if not exists public.quiz_questions (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.sessions(id) on delete cascade,
  question_number     integer not null,
  difficulty          integer not null check (difficulty between 1 and 5),
  question            text not null,
  options             jsonb not null,           -- string[]
  correct_answer_index integer not null check (correct_answer_index between 0 and 3),
  explanation         text not null,
  user_answer_index   integer,                  -- null = not answered yet
  created_at          timestamptz not null default now()
);

create index quiz_questions_session_id_idx on public.quiz_questions(session_id);

alter table public.quiz_questions enable row level security;

create policy "Users can manage quiz questions for their sessions"
  on public.quiz_questions for all
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
