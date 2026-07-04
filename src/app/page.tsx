import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildFolderTree } from "@/lib/utils/buildFolderTree";
import { Header } from "@/components/layout/Header";
import { FolderTree } from "@/components/folders/FolderTree";
import { NewFolderButton } from "@/components/folders/NewFolderButton";
import { TagFilter } from "@/components/tags/TagFilter";
import { FileTable } from "@/components/files/FileTable";
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

  const [{ data: folders }, { data: tags }, { data: filesRaw }, { data: fileTagsRaw }, allowedEmailsResult] =
    await Promise.all([
      supabase.from("folders").select("id, name, parent_id").order("name"),
      supabase.from("tags").select("id, name").order("name"),
      supabase
        .from("files")
        .select("id, name, folder_id, size, mime_type, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("file_tags").select("file_id, tag_id"),
      currentUser.role === "admin"
        ? supabase
            .from("allowed_emails")
            .select("id, email, role, created_at")
            .order("created_at")
        : Promise.resolve({ data: [] as AllowedEmailRow[] }),
    ]);

  const folderTree = buildFolderTree(folders ?? []);

  const tagById = new Map((tags ?? []).map((t) => [t.id, t]));
  const tagsByFile = new Map<string, { id: string; name: string }[]>();
  (fileTagsRaw ?? []).forEach((ft) => {
    const tag = tagById.get(ft.tag_id);
    if (!tag) return;
    const list = tagsByFile.get(ft.file_id) ?? [];
    list.push(tag);
    tagsByFile.set(ft.file_id, list);
  });

  const files: FileRow[] = (filesRaw ?? []).map((f) => ({
    ...f,
    tags: tagsByFile.get(f.id) ?? [],
  }));

  const allowedEmails = (allowedEmailsResult.data ?? []) as AllowedEmailRow[];

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-gray-50">
      <Header currentUser={currentUser} allowedEmails={allowedEmails} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 md:flex-row">
        <aside className="w-full shrink-0 rounded-lg border bg-white p-3 md:w-56">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">
              フォルダ
            </span>
            {currentUser.role === "admin" && <NewFolderButton />}
          </div>
          <div className="max-h-[40vh] overflow-y-auto md:max-h-[70vh]">
            <FolderTree
              tree={folderTree}
              isAdmin={currentUser.role === "admin"}
            />
          </div>
        </aside>
        <main className="flex-1 rounded-lg border bg-white p-4">
          {currentUser.role === "admin" ? (
            <FileDropZone>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <TagFilter tags={tags ?? []} />
                <UploadButton />
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <FileTable files={files} currentUser={currentUser} />
              </div>
            </FileDropZone>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <TagFilter tags={tags ?? []} />
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                <FileTable files={files} currentUser={currentUser} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
