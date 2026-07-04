"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database.types";

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

export async function addAllowedEmail(email: string, role: UserRole) {
  const { supabase, userId } = await requireAdmin();

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error("メールアドレスを入力してください");

  const { error } = await supabase
    .from("allowed_emails")
    .insert({ email: trimmed, role, added_by: userId });

  if (error) {
    if (error.code === "23505") throw new Error("既に登録されているメールアドレスです");
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function removeAllowedEmail(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("allowed_emails").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
