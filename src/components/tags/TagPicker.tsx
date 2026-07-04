"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import type { TagRow } from "@/lib/types/domain";
import { createTag, attachTag, detachTag } from "@/app/actions/tags";

export function TagPicker({
  fileId,
  attachedTags,
}: {
  fileId: string;
  attachedTags: TagRow[];
}) {
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    const names = Array.from(
      new Set(
        input
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean),
      ),
    );
    if (names.length === 0) return;
    setInput("");
    startTransition(async () => {
      await Promise.all(
        names.map(async (name) => {
          const tagId = await createTag(name);
          await attachTag(fileId, tagId);
        }),
      );
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (tagId: string) => {
    startTransition(async () => {
      await detachTag(fileId, tagId);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {attachedTags.map((tag) => (
        <span
          key={tag.id}
          className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
        >
          #{tag.name}
          <button
            onClick={() => handleRemove(tag.id)}
            aria-label={`${tag.name}を外す`}
            className="text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+タグ(カンマ区切りで複数可)"
        disabled={isPending}
        className="w-36 rounded border border-transparent bg-transparent px-1 text-xs focus:border-gray-300 focus:outline-none"
      />
    </div>
  );
}
