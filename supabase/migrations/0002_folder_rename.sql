-- フォルダのリネーム機能のため、adminによるfolders更新を許可するRLSポリシーを追加
-- Supabase SQL Editor で実行してください。

create policy "admins can update folders"
  on public.folders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
