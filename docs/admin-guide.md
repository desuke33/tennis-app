# 管理方法(管理者向けマニュアル)

一般的な使い方(ログイン・閲覧・タグ付け)は [user-guide.md](user-guide.md) を参照してください。ここでは管理者(admin)だけが行える操作と、運用上の管理作業をまとめます。

## 1. アプリ内でできる管理操作

管理者としてログインすると、一般部員には表示されない操作が画面内に追加表示されます(別の管理画面はありません)。

### ログイン許可メールアドレスの管理

1. 画面右上の歯車アイコンをクリック
2. 「member@gmail.com」のような形式でメールアドレスを入力し、ロール(admin/member)を選んで「追加」
3. 一覧から「削除」で許可を取り消せます(既にログイン済みのユーザーのセッションを即座には無効化しません)

**新しい管理者を追加する場合**: 追加時にロールを「admin」に設定してください。ただし、これは初回ログイン時にのみ有効になります。既に一度ログインしたことがある人のロールを後から admin に変えたい場合は、下記4節の手順が必要です。

### フォルダの管理

- フォルダ一覧の「+フォルダ」ボタンで新規作成(現在選択中のフォルダの直下に作られます)
- 各フォルダにマウスオーバー/タップすると、✎(名前変更)と✕(削除)のアイコンが表示されます
- **フォルダを削除すると、中の子フォルダも巻き込んで削除されます。ただし中にあったファイルは削除されず「すべて」表示に残ります**(元のフォルダ分類は失われます)

### ファイルの管理

- 「アップロード」ボタン、または一覧エリアへのドラッグ&ドロップでファイルを追加できます(複数ファイル同時ドロップ可)
- アップロード先は現在選択中のフォルダになります(「すべて」選択時はルート直下)
- 1ファイルあたり50MBまで(超える場合はエラーになります)
- 各ファイルの「削除」ボタンで削除できます。**削除は取り消せません**

## 2. 運用インフラの管理

### アカウント・アクセス情報

| 項目 | 場所 |
|---|---|
| GitHubリポジトリ | https://github.com/desuke33/tennis-app (private) |
| Vercelプロジェクト | `d-storage/tennis-app` (https://vercel.com/d-storage/tennis-app) |
| Supabaseプロジェクト | `tennis-club` (https://supabase.com/dashboard/project/pbnogirrnwfrdeljlmse) |
| Google Cloud Console | OAuthクライアントの管理(プロジェクト名は設定時に作成したもの) |

### デプロイ方法

現状はGitHub連携による自動デプロイが未設定のため、コード変更後は手動でデプロイする必要があります。

```powershell
git push                # GitHubへの反映(バックアップ・履歴用)
vercel --prod --yes     # 本番環境へのデプロイ
```

GitHub連携(pushするだけで自動デプロイ)を有効にしたい場合は、Vercelダッシュボードの Project Settings → Git から接続してください(GitHub側でVercel Appにこのリポジトリへのアクセス権を許可する必要があります)。

### 環境変数

Vercel Project Settings → Environment Variables に以下3つが設定されています(production/preview/development全てに設定済み)。

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (⚠️ 強い権限を持つため、絶対に外部に漏らさないこと)

### データベースの変更(マイグレーション)

スキーマ変更が必要な場合は `supabase/migrations/` に新しいSQLファイルを追加し、SupabaseダッシュボードのSQL Editorで実行してください(過去のファイルは変更せず、新しい連番ファイルを追加する方式)。

## 3. Google OAuth関連の注意点

### 他の部員にテストしてもらう前に確認すること

Google Cloud ConsoleのOAuth同意画面が「テスト中(Testing)」ステータスのままだと、明示的に「テストユーザー」として登録したGoogleアカウント以外はログインの時点でGoogle側のエラーで弾かれます(アプリの許可リストとは別の制限です)。

- 少人数のテストであれば、Google Cloud Console → OAuth同意画面 → テストユーザーに対象者を追加
- 本格運用する場合は、同意画面を「本番(In production)」に公開する(Googleの審査が必要になる場合があります。内部利用のみのスコープであれば審査不要なことが多いです)

### リダイレクトURLについて

デプロイ先のURLを変更した場合(独自ドメイン設定など)、Supabaseダッシュボード → Authentication → URL Configuration → Redirect URLs に新しいURLの `/auth/callback` を追加登録する必要があります。

## 4. ユーザーのロールを後から変更する場合

`allowed_emails` のロールを変更しても、**既にログインしたことがあるユーザーには反映されません**(初回ログイン時にのみコピーされる仕様のため)。既存ユーザーのロールを変更したい場合は、SupabaseのSQL Editorで直接更新してください。

```sql
update public.users set role = 'admin' where email = '対象のメールアドレス';
```

## 5. トラブル対応の参考

- **特定の部員がログインできない**: (1) `allowed_emails` に登録されているか (2) Google OAuth同意画面のテストユーザーに入っているか、の2点を確認
- **アップロードが失敗する**: ファイルサイズが50MBを超えていないか確認
- **アプリ全体にアクセスできない**: Vercelのデプロイ状況(https://vercel.com/d-storage/tennis-app )を確認。Supabase側の障害情報は https://status.supabase.com も参考に
