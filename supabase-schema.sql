-- DocCraft: Supabase テーブルスキーマ
-- Supabase SQL Editor で実行してください

-- ドキュメントテーブル
create table if not exists public.documents (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('slides', 'doc', 'spreadsheet')),
  title text not null default '',
  content jsonb not null default '{}',
  thumbnail_theme text default 'dark-blue',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス
create index if not exists idx_documents_user_id on public.documents(user_id);
create index if not exists idx_documents_updated on public.documents(user_id, updated_at desc);

-- Row Level Security (RLS) を有効化
alter table public.documents enable row level security;

-- ポリシー: ユーザーは自分のドキュメントのみ操作可能
create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can create own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);
