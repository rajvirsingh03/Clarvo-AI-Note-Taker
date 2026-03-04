-- Migration: users
-- Extends the Supabase auth.users table with Clarvo-specific profile fields.

create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  avatar_url   text,
  billing_tier text not null default 'FREE'
    check (billing_tier in ('FREE','PRO')),
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  notion_access_token    text,
  notion_workspace_id    text,
  notion_workspace_name  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Row-Level Security
alter table public.users enable row level security;

create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create user profile on auth sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();
