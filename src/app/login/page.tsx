import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { InAppBrowserWarning } from "@/components/auth/InAppBrowserWarning";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          テニス部ファイル管理
        </h1>
        <p className="text-sm text-gray-500">
          部員登録済みのGoogleアカウントでログインしてください
        </p>
      </div>

      {error === "not_allowed" && (
        <p className="max-w-sm rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          このGoogleアカウントは部の許可リストに登録されていません。管理者に連絡してください。
        </p>
      )}

      <InAppBrowserWarning />

      <GoogleSignInButton />
    </div>
  );
}
