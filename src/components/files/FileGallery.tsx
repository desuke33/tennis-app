"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatBytes } from "@/lib/utils/formatBytes";
import type { FileRow, CurrentUser } from "@/lib/types/domain";
import { getFileUrl, deleteFile } from "@/app/actions/files";
import { Button } from "@/components/ui/Button";

// File System Access API(保存場所を選べるブラウザ用)の最小型定義
interface SaveFilePickerWindow extends Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
}

function fileEmoji(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation")) return "📽️";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "🗜️";
  return "📄";
}

export function FileGallery({
  files,
  thumbUrls,
  currentUser,
}: {
  files: FileRow[];
  thumbUrls: Record<string, string>;
  currentUser: CurrentUser;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const folderId = searchParams.get("folder");
  const [selected, setSelected] = useState<FileRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = files.filter((f) => !folderId || f.folder_id === folderId);

  const closeDialog = () => {
    setSelected(null);
    setError(null);
  };

  // 表示: 新しいタブでファイルを開く(タップ直後にタブを確保してポップアップブロックを回避)
  const handleView = (file: FileRow) => {
    setError(null);
    const newTab = window.open("", "_blank", "noopener,noreferrer");
    startTransition(async () => {
      try {
        const url = await getFileUrl(file.id, "view");
        if (newTab) {
          newTab.location.href = url;
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        closeDialog(); // 元の画面はこのまま(ポップアップだけ閉じる)
      } catch (e) {
        newTab?.close();
        setError(e instanceof Error ? e.message : "表示に失敗しました");
      }
    });
  };

  // ダウンロード: 新しいタブを開かず、その場で保存を開始する
  // - 保存場所を選べるブラウザ(PCのChrome/Edge等)は保存ダイアログを表示
  // - それ以外(iPhoneのSafari、Android等)は端末のダウンロード機能で保存
  //   (Content-Disposition: attachment のため画面遷移は起きない)
  const handleDownload = (file: FileRow) => {
    setError(null);
    startTransition(async () => {
      try {
        const url = await getFileUrl(file.id, "download");
        const w = window as SaveFilePickerWindow;
        if (w.showSaveFilePicker) {
          try {
            const handle = await w.showSaveFilePicker({
              suggestedName: file.name,
            });
            const res = await fetch(url);
            if (!res.ok) throw new Error("ダウンロードに失敗しました");
            const blob = await res.blob();
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            closeDialog();
            return;
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
              // ユーザーが保存ダイアログをキャンセルした
              closeDialog();
              return;
            }
            // 失敗したら通常のダウンロードにフォールバック
          }
        }
        window.location.href = url;
        closeDialog();
      } catch (e) {
        setError(e instanceof Error ? e.message : "ダウンロードに失敗しました");
      }
    });
  };

  const handleDelete = (file: FileRow) => {
    if (!confirm(`「${file.name}」を削除しますか？この操作は取り消せません。`))
      return;
    startTransition(async () => {
      try {
        await deleteFile(file.id);
        if (selected?.id === file.id) closeDialog();
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  };

  if (visible.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-400">
        ファイルがありません
      </p>
    );
  }

  return (
    <>
      {/* 3列グリッド。タイルは正方形なので、正方形のコンテナに3行がちょうど収まる */}
      <div className="grid aspect-square content-start gap-1 overflow-y-auto grid-cols-3">
        {visible.map((file) => {
          const thumb = thumbUrls[file.id];
          return (
            <div key={file.id} className="relative aspect-square">
              <button
                onClick={() => setSelected(file)}
                className="relative h-full w-full overflow-hidden rounded-md border bg-gray-100"
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt={file.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center pb-5 text-3xl">
                    {fileEmoji(file.mime_type)}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5">
                  <span className="block truncate text-[10px] leading-tight text-white">
                    {file.name}
                  </span>
                </span>
              </button>
              {currentUser.role === "admin" && (
                <button
                  onClick={() => handleDelete(file)}
                  disabled={isPending}
                  aria-label={`${file.name}を削除`}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-xs text-gray-500 shadow hover:text-red-600 disabled:opacity-50"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xs rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="break-all text-sm font-medium text-gray-900">
                {selected.name}
              </p>
              <button
                onClick={closeDialog}
                aria-label="閉じる"
                className="shrink-0 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-400">
              {formatBytes(selected.size)}
            </p>
            {thumbUrls[selected.id] && (
              <img
                src={thumbUrls[selected.id]}
                alt={selected.name}
                className="mb-4 max-h-40 w-full rounded object-contain"
              />
            )}
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <div className="flex flex-col gap-2">
              <Button onClick={() => handleView(selected)} disabled={isPending}>
                表示
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDownload(selected)}
                disabled={isPending}
              >
                ダウンロード
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
