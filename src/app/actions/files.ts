"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "club-files";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("管理者のみ実行できます");

  return { supabase, userId: user.id };
}

function getExtension(name: string) {
  const match = name.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : "";
}

export async function uploadFile(formData: FormData) {
  const { supabase, userId } = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("ファイルが選択されていません");

  const folderIdRaw = formData.get("folderId");
  const folderId = typeof folderIdRaw === "string" && folderIdRaw ? folderIdRaw : null;

  const fileId = randomUUID();
  // Storage上のキーはASCII安全にするため、表示名(日本語可)はDBのname列にのみ保存する
  const storagePath = `${folderId ?? "root"}/${fileId}${getExtension(file.name)}`;

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(arrayBuffer), {
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) throw new Error(uploadError.message);

  const { error: insertError } = await supabase.from("files").insert({
    id: fileId,
    name: file.name,
    storage_path: storagePath,
    folder_id: folderId,
    size: file.size,
    mime_type: file.type || "application/octet-stream",
    uploaded_by: userId,
  });

  if (insertError) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    throw new Error(insertError.message);
  }

  revalidatePath("/");
}

export async function deleteFile(fileId: string) {
  const { supabase } = await requireAdmin();

  const { data: fileRow, error: fetchError } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (fetchError || !fileRow) throw new Error("ファイルが見つかりません");

  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([fileRow.storage_path]);

  const { error: deleteError } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  if (deleteError) throw new Error(deleteError.message);

  revalidatePath("/");
}

export async function getFileUrl(
  fileId: string,
  mode: "view" | "download",
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data: fileRow, error } = await supabase
    .from("files")
    .select("storage_path, name")
    .eq("id", fileId)
    .single();

  if (error || !fileRow) throw new Error("ファイルが見つかりません");

  const admin = createAdminClient();
  const { data, error: signError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(
      fileRow.storage_path,
      60,
      mode === "download" ? { download: fileRow.name } : undefined,
    );

  if (signError || !data) {
    throw new Error(signError?.message ?? "URLの発行に失敗しました");
  }

  return data.signedUrl;
}
