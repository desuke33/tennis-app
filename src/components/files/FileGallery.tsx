"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useTransition } from "react";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = files.filter((f) => !folderId || f.folder_id === folderId);

  const selectedIsImage = selected?.mime_type.startsWith("image/") ?? false;
  const selectedIsPdf = selected?.mime_type.includes("pdf") ?? false;

  // ダイアログを開いたとき、画像/PDFはプレビュー用の署名URLを取得する
  // (画像はサムネイル用の署名URLをそのまま流用、PDFはその場で取得)
  useEffect(() => {
    if (!selected) {
      setPreviewUrl(null);
      return;
    }
    if (selectedIsImage) {
      setPreviewUrl(thumbUrls[selected.id] ?? null);
      return;
    }
    if (selectedIsPdf) {
      let cancelled = false;
      setPreviewUrl(null);
      getFileUrl(selected.id, "view")
        .then((url) => {
          if (!cancelled) setPreviewUrl(url);
        })
        .catch(() => {
          if (!cancelled) setPreviewUrl(null);
        });
      return () => {
        cancelled = true;
      };
    }
    setPreviewUrl(null);
  }, [selected, selectedIsImage, selectedIsPdf, thumbUrls]);

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

  // ダウンロード: 保存先を毎回はっきり選ばせる。優先順位は以下の通り
  // 1. PCなど保存ダイアログを出せるブラウザ(Chrome/Edge): ファイル保存ダイアログ
  // 2. iPhone/Android: OS標準の共有シート(Web Share API)を開き、
  //    「ファイル」「Google Drive」等の保存先をその場で選ばせる
  //    (追加アプリの有無に関わらず、常に何らかの保存先が選べる)
  // 3. それ以外: 通常のダウンロード(Content-Disposition: attachment)
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
            // 失敗したら他の方法にフォールバック
          }
        }

        if (navigator.share && navigator.canShare) {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("ダウンロードに失敗しました");
            const blob = await res.blob();
            const shareFile = new File([blob], file.name, {
              type: file.mime_type || blob.type,
            });
            if (navigator.canShare({ files: [shareFile] })) {
              await navigator.share({ files: [shareFile] });
              closeDialog();
              return;
            }
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
              // ユーザーが共有シートをキャンセルした
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
      {/* 3列グリッド。タイルは正方形なので、縦横比6:5のコンテナで縦2.5行・横3列分だけ見える */}
      <div className="grid aspect-[6/5] content-start gap-1 overflow-y-auto grid-cols-3">
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
          <div className="flex max-h-[90vh] w-full max-w-sm flex-col rounded-lg bg-white p-4 shadow-xl">
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
            <p className="mb-3 text-xs text-gray-400">
              {formatBytes(selected.size)}
            </p>

            {/* プレビュー */}
            <div className="mb-3 min-h-[8rem] flex-1 overflow-hidden rounded bg-gray-50">
              {selectedIsImage && previewUrl ? (
                <img
                  src={previewUrl}
                  alt={selected.name}
                  className="mx-auto max-h-[55vh] w-full object-contain"
                />
              ) : selectedIsPdf && previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={selected.name}
                  className="h-[55vh] w-full"
                />
              ) : selectedIsImage || selectedIsPdf ? (
                <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                  読み込み中...
                </div>
              ) : (
                <div className="flex h-32 flex-col items-center justify-center gap-1 text-gray-400">
                  <span className="text-4xl">{fileEmoji(selected.mime_type)}</span>
                  <span className="text-xs">
                    プレビュー非対応。「表示」で開いてください
                  </span>
                </div>
              )}
            </div>

            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => handleView(selected)}
                disabled={isPending}
              >
                表示
              </Button>
              <Button
                className="flex-1"
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
