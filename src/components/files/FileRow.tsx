"use client";

import { useState, useTransition } from "react";
import { formatBytes } from "@/lib/utils/formatBytes";
import type { FileRow as FileRowType, CurrentUser } from "@/lib/types/domain";
import { getFileUrl, deleteFile } from "@/app/actions/files";
import { Button } from "@/components/ui/Button";

export function FileRow({
  file,
  currentUser,
}: {
  file: FileRowType;
  currentUser: CurrentUser;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const openFile = (mode: "view" | "download") => {
    setError(null);
    // モバイルSafari等はawait後のwindow.openをポップアップとしてブロックすることがあるため、
    // クリック直後(非同期処理の前)に空のタブを開いておき、後からURLを設定する
    const newTab = window.open("", "_blank", "noopener,noreferrer");
    startTransition(async () => {
      try {
        const url = await getFileUrl(file.id, mode);
        if (newTab) {
          newTab.location.href = url;
          // ダウンロード時はページ遷移が起きず空タブが残るだけなので、少し待って閉じる
          if (mode === "download") {
            setTimeout(() => newTab.close(), 1500);
          }
        } else {
          window.location.href = url;
        }
      } catch (e) {
        newTab?.close();
        setError(e instanceof Error ? e.message : "処理に失敗しました");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`「${file.name}」を削除しますか？この操作は取り消せません。`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteFile(file.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  };

  return (
    <tr className="border-b last:border-0">
      <td className="max-w-[220px] truncate py-2">{file.name}</td>
      <td className="hidden py-2 text-gray-500 sm:table-cell">
        {formatBytes(file.size)}
      </td>
      <td className="py-2 text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => openFile("view")}
            disabled={isPending}
          >
            表示
          </Button>
          <Button
            variant="secondary"
            onClick={() => openFile("download")}
            disabled={isPending}
          >
            DL
          </Button>
          {currentUser.role === "admin" && (
            <Button variant="danger" onClick={handleDelete} disabled={isPending}>
              削除
            </Button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}
