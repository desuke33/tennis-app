-- タグ機能の廃止に伴い、タグ関連テーブルを削除する。
-- アプリのコードは既にこれらのテーブルを一切参照していないため、
-- この削除は任意(残しておいても害はないが、不要なら実行してよい)。
-- ⚠️ 実行すると既存のタグ・ファイルへのタグ付けデータは失われます。
-- Supabase SQL Editor で実行してください。

drop table if exists public.file_tags;
drop table if exists public.tags;
