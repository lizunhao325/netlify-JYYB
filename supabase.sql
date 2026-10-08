-- 在 Supabase SQL Editor 执行一次
create table if not exists public.trading_journal_cloud (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.trading_journal_cloud enable row level security;
create policy "own journal select" on public.trading_journal_cloud for select using (auth.uid() = user_id);
create policy "own journal insert" on public.trading_journal_cloud for insert with check (auth.uid() = user_id);
create policy "own journal update" on public.trading_journal_cloud for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
