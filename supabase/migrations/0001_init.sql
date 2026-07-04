-- テニス部ファイル管理アプリ 初期スキーマ
-- Supabase SQL Editor で実行してください。

-- Extensions
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============ ENUM ============
create type public.user_role as enum ('admin', 'member');

-- ============ ALLOWED EMAILS (ログイン許可リスト、初回ログイン時のroleも兼ねる) ============
create table public.allowed_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role public.user_role not null default 'member',
  added_by uuid,
  created_at timestamptz not null default now()
);

-- ============ USERS (auth.users をミラーリング) ============
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

alter table public.allowed_emails
  add constraint allowed_emails_added_by_fkey
  foreign key (added_by) references public.users(id);

-- ============ FOLDERS ============
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create unique index folders_unique_name_with_parent
  on public.folders (parent_id, name) where parent_id is not null;
create unique index folders_unique_name_root
  on public.folders (name) where parent_id is null;

-- ============ FILES ============
create table public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null unique,
  folder_id uuid references public.folders(id) on delete set null,
  size bigint not null,
  mime_type text not null,
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
create index files_folder_id_idx on public.files(folder_id);

-- ============ TAGS ============
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
create unique index tags_unique_name_ci on public.tags (lower(name));

-- ============ FILE_TAGS (多対多) ============
create table public.file_tags (
  file_id uuid not null references public.files(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  primary key (file_id, tag_id)
);

-- ============ TRIGGER: auth.users insert時にpublic.usersを作成し、許可リストを強制 ============
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select role into v_role
  from public.allowed_emails
  where email = new.email;

  if v_role is null then
    raise exception 'EMAIL_NOT_ALLOWED: % is not on the club allowlist', new.email;
  end if;

  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    v_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============ RLS ============
alter table public.users enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.tags enable row level security;
alter table public.file_tags enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- users ----
create policy "users can read all member rows"
  on public.users for select
  to authenticated
  using (true);

-- ---- allowed_emails ----
create policy "admins can read allowed_emails"
  on public.allowed_emails for select
  to authenticated
  using (public.is_admin());

create policy "admins can insert allowed_emails"
  on public.allowed_emails for insert
  to authenticated
  with check (public.is_admin());

create policy "admins can delete allowed_emails"
  on public.allowed_emails for delete
  to authenticated
  using (public.is_admin());

-- ---- folders ----
create policy "members can read folders"
  on public.folders for select
  to authenticated
  using (true);

create policy "admins can insert folders"
  on public.folders for insert
  to authenticated
  with check (public.is_admin());

create policy "admins can delete folders"
  on public.folders for delete
  to authenticated
  using (public.is_admin());

-- ---- files ----
create policy "members can read files"
  on public.files for select
  to authenticated
  using (true);

create policy "admins can insert files"
  on public.files for insert
  to authenticated
  with check (public.is_admin());

create policy "admins can delete files"
  on public.files for delete
  to authenticated
  using (public.is_admin());

-- ---- tags ----
create policy "members can read tags"
  on public.tags for select
  to authenticated
  using (true);

create policy "members can create tags"
  on public.tags for insert
  to authenticated
  with check (auth.uid() is not null);

-- ---- file_tags ----
create policy "members can read file_tags"
  on public.file_tags for select
  to authenticated
  using (true);

create policy "members can attach tags"
  on public.file_tags for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "members can detach tags they attached, admins detach any"
  on public.file_tags for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- ============ STORAGE BUCKET ============
insert into storage.buckets (id, name, public)
values ('club-files', 'club-files', false)
on conflict (id) do nothing;

-- ============ SEED: 初期管理者 ============
-- 必要に応じてメールアドレスを変更してください。
insert into public.allowed_emails (email, role) values ('desuke33@gmail.com', 'admin');
