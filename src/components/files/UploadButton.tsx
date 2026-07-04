"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { uploadFile } from "@/app/actions/files";

export function UploadButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folder");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (folderId) formData.set("folderId", folderId);
    setError(null);
    startTransition(async () => {
      try {
        await uploadFile(formData);
        setOpen(false);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "アップロードに失敗しました");
      }
    });
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>アップロード</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="ファイルをアップロード">
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="file" name="file" required className="text-sm" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "アップロード中..." : "アップロード"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
