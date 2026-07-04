"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TagRow } from "@/lib/types/domain";

export function TagFilter({ tags }: { tags: TagRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const selected = new Set(
    (searchParams.get("tags") ?? "").split(",").filter(Boolean),
  );

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) params.set("tags", Array.from(next).join(","));
    else params.delete("tags");
    router.push(`/?${params.toString()}`);
  };

  if (tags.length === 0) return <div />;

  const normalizedQuery = query.trim().toLowerCase();
  const visibleTags = normalizedQuery
    ? tags.filter(
        (tag) =>
          tag.name.toLowerCase().includes(normalizedQuery) ||
          selected.has(tag.id),
      )
    : tags;

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 タグ検索"
        className="w-28 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
      />
      {visibleTags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggle(tag.id)}
          className={`rounded-full border px-3 py-1 text-xs ${
            selected.has(tag.id)
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          #{tag.name}
        </button>
      ))}
      {normalizedQuery && visibleTags.length === 0 && (
        <span className="text-xs text-gray-400">一致するタグがありません</span>
      )}
    </div>
  );
}
