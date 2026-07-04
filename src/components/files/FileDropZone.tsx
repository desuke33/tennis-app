"use client";

import {
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { uploadFile } from "@/app/actions/files";

export function FileDropZone({ children }: { children: ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const dragCounter = useRef(0);
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folder");

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes("Files")) return;
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setErrors([]);
    startTransition(async () => {
      const results = await Promise.allSettled(
        files.map((file) => {
          const formData = new FormData();
          formData.set("file", file);
          if (folderId) formData.set("folderId", folderId);
          return uploadFile(formData);
        }),
      );

      const failed = results
        .map((r, i) =>
          r.status === "rejected"
            ? `${files[i].name}: ${
                r.reason instanceof Error
                  ? r.reason.message
                  : "アップロードに失敗しました"
              }`
            : null,
        )
        .filter((message): message is string => message !== null);

      setErrors(failed);
    });
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      {children}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500 bg-blue-50/90">
          <p className="text-sm font-medium text-blue-700">
            ここにファイルをドロップしてアップロード
          </p>
        </div>
      )}
      {isPending && (
        <p className="mt-2 text-xs text-gray-500">アップロード中...</p>
      )}
      {errors.length > 0 && (
        <div className="mt-2 space-y-1 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
