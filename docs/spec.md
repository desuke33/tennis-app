# テニス部ファイル管理アプリ 仕様書

最終更新: 2026-07-04

## 1. 概要

テニス部内で使用するファイル管理Webアプリケーション。Googleアカウントでログインした部員のみが、練習メニュー・戦略資料・名簿・写真動画などのファイルをフォルダ階層とタグで整理して閲覧・ダウンロードできる。管理者はファイルのアップロード/削除、フォルダの作成/リネーム/削除、ログイン許可メールアドレスの管理を行う。

## 2. 技術スタック

- **フレームワーク**: Next.js 16 (App Router, TypeScript, Turbopack)
- **バックエンド**: Supabase (Postgres, Auth, Storage)
- **スタイリング**: Tailwind CSS v4
- **ホスティング**: Vercel
- **認証**: Google OAuth 2.0 (Supabase Auth経由)

リポジトリ: https://github.com/desuke33/tennis-app
本番URL: https://tennis-app-theta-lemon.vercel.app

## 3. ロールと権限

| ロール | 権限 |
|---|---|
| admin(管理者) | ファイルのアップロード/削除、フォルダの作成/リネーム/削除、ログイン許可メールアドレスの追加/削除、member の全権限 |
| member(一般部員) | 全ファイル・フォルダの閲覧/ダウンロード、タグの作成/付与/削除(自分が付けたもの) |

ロールは `allowed_emails` テーブルにメールアドレスと共に事前登録し、初回ログイン時に `public.users` テーブルへコピーされる(詳細は5節)。

## 4. 認証フロー

1. ログイン画面で「Googleでログイン」を押すと `supabase.auth.signInWithOAuth({provider: 'google'})` を実行し、Google認証画面へリダイレクト
2. Google認証完了後、`/auth/callback` ルートでコードをセッションに交換(`exchangeCodeForSession`)
3. 交換時、Postgresトリガー(`handle_new_auth_user`)が `allowed_emails` テーブルを参照し、登録が無いメールアドレスは例外を投げてサインイン自体を失敗させる
4. 許可リスト外の場合は `/login?error=not_allowed` にリダイレクトされ、エラーメッセージを表示
5. `src/proxy.ts`(Next.js 16のmiddleware相当)が全リクエストでセッションを更新し、未ログイン時は `/login` にリダイレクト

**注意**: `allowed_emails.role` は初回ログイン時にのみ `public.users.role` へコピーされる。既にログイン済みのユーザーのロールを事後変更したい場合、`allowed_emails` を更新しても反映されないため、SupabaseのSQL Editorで `public.users` を直接更新する必要がある(詳細は管理方法参照)。

## 5. データベース設計

マイグレーションファイル: `supabase/migrations/0001_init.sql`, `0002_folder_rename.sql`

### users(auth.usersをミラーリング)
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | auth.users.id と同じ |
| email | text | メールアドレス |
| name | text | 表示名(Googleアカウント名) |
| role | enum(admin/member) | ロール |
| created_at | timestamptz | 登録日時 |

### allowed_emails(ログイン許可リスト)
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| email | text unique | 許可するメールアドレス |
| role | enum(admin/member) | 初回ログイン時に付与されるロール |
| added_by | uuid FK→users | 追加した管理者 |
| created_at | timestamptz | |

### folders(フォルダ、階層構造)
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| name | text | フォルダ名(同一親内でユニーク) |
| parent_id | uuid FK→folders, nullable | 親フォルダ(自己参照)。削除時 CASCADE |
| created_by | uuid FK→users | |

### files(ファイル)
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | Storageのオブジェクトキーにも使用 |
| name | text | 元のファイル名(日本語可、表示・ダウンロード時に使用) |
| storage_path | text unique | Storage上のパス(ASCII安全、UUID+拡張子) |
| folder_id | uuid FK→folders, nullable | 所属フォルダ。フォルダ削除時 SET NULL(ファイルは消えず「すべて」に残る) |
| size | bigint | バイト数 |
| mime_type | text | MIMEタイプ |
| uploaded_by | uuid FK→users | |

### tags / file_tags(多対多)
| カラム | 型 | 説明 |
|---|---|---|
| tags.id | uuid PK | |
| tags.name | text | タグ名(大文字小文字を無視してユニーク) |
| file_tags.file_id / tag_id | uuid FK | 複合主キー |

### 権限制御(RLS)
全テーブルでRow Level Securityを有効化。`select` は認証済みユーザー全員に許可。`insert/delete` は `folders`/`files`/`allowed_emails` が管理者限定、`tags`/`file_tags` は認証済みユーザーなら誰でも作成可能。`is_admin()` というPostgres関数で管理者判定している。

## 6. Storage設計

- バケット名: `club-files`(非公開)
- パス規約: `{folder_id または "root"}/{file-uuid}{拡張子}`(日本語ファイル名を含めるとSupabase Storageが受け付けないため、Storage上のキーはASCII安全な形式に限定)
- アップロード/削除/URL発行は全てServer Action経由でservice-roleクライアント(`src/lib/supabase/admin.ts`)を使用し、admin判定はアプリ側で実施
- ファイル閲覧・ダウンロードは60秒有効の署名付きURLを都度発行。ダウンロード時は `Content-Disposition: attachment` を付与し元のファイル名で保存されるようにしている

## 7. 主要機能

- Googleログイン + 許可リストによるアクセス制御
- フォルダ階層(作成・リネーム・削除は管理者のみ)
- ファイルのアップロード(ボタンクリック、または複数ファイル同時ドラッグ&ドロップ)、削除(管理者のみ)
- ファイルの「表示」(新しいタブで開く)と「DL」(ネイティブ保存ダイアログでダウンロード)を分離
- タグ機能: カンマ区切りで複数タグを一度に作成・付与可能、タグ検索窓による絞り込み表示
- 管理者向け設定パネルからログイン許可メールアドレスの追加・削除(ロール指定可)
- レスポンシブ対応(PC・スマートフォン両対応)

## 8. インフラ・環境変数

Vercelプロジェクト: `d-storage/tennis-app`

必要な環境変数(Vercel + `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`(サーバー専用、絶対にクライアントに公開しない)

デプロイは現状 `vercel --prod` によるCLI手動デプロイ(GitHub連携による自動デプロイは未設定、必要ならVercelダッシュボードから設定可能)。

## 9. 既知の制限事項

- ファイルアップロードの上限は1リクエストあたり50MB(`next.config.ts` の `serverActions.bodySizeLimit`)
- Supabase無料枠のストレージ容量には上限がある(要確認・拡張時は有料プラン検討)
- `allowed_emails.role` の変更は新規ログイン時のみ反映(5節参照)
- タグの削除は「自分が付けたタグ、または管理者」のみ可能
- フォルダ削除は子フォルダを巻き込んでカスケード削除される(ファイルはルートに残る)
- ダウンロード履歴・操作ログの記録機能は未実装
