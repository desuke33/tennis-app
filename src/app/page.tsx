import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildFolderTree } from "@/lib/utils/buildFolderTree";
import { Header } from "@/components/layout/Header";
import { FolderTree } from "@/components/folders/FolderTree";
import { NewFolderButton } from "@/components/folders/NewFolderButton";
import { FileGallery } from "@/components/files/FileGallery";
import { UploadButton } from "@/components/files/UploadButton";
import { FileDropZone } from "@/components/files/FileDropZone";
import type { AllowedEmailRow, CurrentUser, FileRow } from "@/lib/types/domain";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, name, role")
    .eq("id", authUser.id)
    .single();

  if (!profile) redirect("/login?error=not_allowed");

  const currentUser = profile as CurrentUser;

  const [{ data: folders }, { data: filesRaw }, allowedEmailsResult] =
    await Promise.all([
      supabase.from("folders").select("id, name, parent_id").order("name"),
      supabase
        .from("files")
        .select("id, name, folder_id, size, mime_type, created_at, storage_path")
        .order("created_at", { ascending: false }),
      currentUser.role === "admin"
        ? supabase
            .from("allowed_emails")
            .select("id, email, role, created_at")
            .order("created_at")
        : Promise.resolve({ data: [] as AllowedEmailRow[] }),
    ]);

  const folderTree = buildFolderTree(folders ?? []);

  // storage_path はサムネイルURL生成にのみ使い、クライアントへは渡さない
  const files: FileRow[] = (filesRaw ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    folder_id: f.folder_id,
    size: f.size,
    mime_type: f.mime_type,
    created_at: f.created_at,
  }));

  // 画像ファイルはギャラリーのサムネイル用に署名付きURLをまとめて発行(1時間有効)
  const imageFiles = (filesRaw ?? []).filter((f) =>
    f.mime_type.startsWith("image/"),
  );
  const thumbUrls: Record<string, string> = {};
  if (imageFiles.length > 0) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from("club-files")
      .createSignedUrls(
        imageFiles.map((f) => f.storage_path),
        3600,
      );
    (signed ?? []).forEach((entry, i) => {
      if (entry.signedUrl) thumbUrls[imageFiles[i].id] = entry.signedUrl;
    });
  }

  const allowedEmails = (allowedEmailsResult.data ?? []) as AllowedEmailRow[];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-gray-50">
      <Header currentUser={currentUser} allowedEmails={allowedEmails} />
      {/* PCでもスマホと同じ1カラム・端末幅のレイアウトに固定する */}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-3">
        <aside className="rounded-lg border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              フォルダ
            </span>
            {currentUser.role === "admin" && <NewFolderButton />}
          </div>
          <div className="h-40 overflow-y-auto">
            <FolderTree
              tree={folderTree}
              isAdmin={currentUser.role === "admin"}
            />
          </div>
        </aside>
        <main className="rounded-lg border bg-white p-3">
          {currentUser.role === "admin" ? (
            <FileDropZone>
              <div className="mb-3 flex items-center justify-end">
                <UploadButton />
              </div>
              <FileGallery
                files={files}
                thumbUrls={thumbUrls}
                currentUser={currentUser}
              />
            </FileDropZone>
          ) : (
            <FileGallery
              files={files}
              thumbUrls={thumbUrls}
              currentUser={currentUser}
            />
          )}
        </main>
      </div>
    </div>
  );
}
