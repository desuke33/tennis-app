"use client";

import { useSearchParams } from "next/navigation";
import type { FileRow as FileRowType, CurrentUser } from "@/lib/types/domain";
import { FileRow } from "./FileRow";

export function FileTable({
  files,
  currentUser,
}: {
  files: FileRowType[];
  currentUser: CurrentUser;
}) {
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folder");

  const filtered = files.filter((f) => {
    if (folderId && f.folder_id !== folderId) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">
        ファイルがありません
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-gray-500">
          <th className="py-2 font-medium">ファイル名</th>
          <th className="hidden py-2 font-medium sm:table-cell">サイズ</th>
          <th className="py-2 text-right font-medium">操作</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((file) => (
          <FileRow key={file.id} file={file} currentUser={currentUser} />
        ))}
      </tbody>
    </table>
  );
}
