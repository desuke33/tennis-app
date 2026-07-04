"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTag(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("タグ名を入力してください");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("tags")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();

  if (existing) return existing.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmed, created_by: user?.id })
    .select("id")
    .single();

  if (error) {
    // 同時作成でユニーク制約に引っかかった場合は既存タグを再取得
    if (error.code === "23505") {
      const { data: fallback } = await supabase
        .from("tags")
        .select("id")
        .ilike("name", trimmed)
        .single();
      if (fallback) return fallback.id;
    }
    throw new Error(error.message);
  }

  revalidatePath("/");
  return data.id;
}

export async function attachTag(fileId: string, tagId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase
    .from("file_tags")
    .insert({ file_id: fileId, tag_id: tagId, created_by: user.id });

  if (error && error.code !== "23505") throw new Error(error.message);

  revalidatePath("/");
}

export async function detachTag(fileId: string, tagId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("file_tags")
    .delete()
    .eq("file_id", fileId)
    .eq("tag_id", tagId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}
