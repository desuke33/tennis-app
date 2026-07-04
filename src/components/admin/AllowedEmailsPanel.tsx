"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { AllowedEmailRow } from "@/lib/types/domain";
import type { UserRole } from "@/lib/types/database.types";
import { addAllowedEmail, removeAllowedEmail } from "@/app/actions/allowedEmails";

export function AllowedEmailsPanel({
  allowedEmails,
}: {
  allowedEmails: AllowedEmailRow[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addAllowedEmail(email, role);
        setEmail("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "追加に失敗しました");
      }
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      await removeAllowedEmail(id);
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="許可メールアドレス管理"
        className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
      >
        ⚙️
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="ログイン許可メールアドレス"
      >
        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="member@gmail.com"
            required
            className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <Button type="submit" disabled={isPending}>
            追加
          </Button>
        </form>
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {allowedEmails.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50"
            >
              <span className="truncate">
                {row.email}{" "}
                <span className="text-xs text-gray-400">({row.role})</span>
              </span>
              <button
                onClick={() => handleRemove(row.id)}
                className="text-xs text-red-500 hover:underline"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
