"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CurrentUser, AllowedEmailRow } from "@/lib/types/domain";
import { AllowedEmailsPanel } from "@/components/admin/AllowedEmailsPanel";
import { HUB_URL } from "@/lib/constants";

export function Header({
  currentUser,
  allowedEmails,
}: {
  currentUser: CurrentUser;
  allowedEmails: AllowedEmailRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <header className="flex items-center justify-between border-b bg-white px-4 py-3">
      <h1 className="truncate text-sm font-semibold text-gray-900">
        三菱自動車硬式テニス部
        <span className="ml-1 font-normal text-gray-400">ファイル</span>
      </h1>
      <div className="flex items-center gap-1">
        <a
          href={HUB_URL}
          className="whitespace-nowrap rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          ホーム ↗
        </a>
        <span className="hidden text-sm text-gray-500 sm:inline">
          {currentUser.name ?? currentUser.email}
        </span>
        {currentUser.role === "admin" && (
          <AllowedEmailsPanel allowedEmails={allowedEmails} />
        )}
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          サインアウト
        </button>
      </div>
    </header>
  );
}
