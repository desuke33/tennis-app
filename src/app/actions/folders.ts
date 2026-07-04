"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createFolder(name: string, parentId: string | null) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("フォルダ名を入力してください");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("folders").insert({
    name: trimmed,
    parent_id: parentId,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("同じ名前のフォルダが既に存在します");
    }
    if (error.code === "42501") {
      throw new Error("管理者のみフォルダを作成できます");
    }
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function renameFolder(folderId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("フォルダ名を入力してください");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("folders")
    .update({ name: trimmed })
    .eq("id", folderId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("同じ名前のフォルダが既に存在します");
    }
    if (error.code === "42501") {
      throw new Error("管理者のみフォルダ名を変更できます");
    }
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function deleteFolder(folderId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("folders").delete().eq("id", folderId);

  if (error) {
    if (error.code === "42501") {
      throw new Error("管理者のみフォルダを削除できます");
    }
    throw new Error(error.message);
  }

  revalidatePath("/");
}
