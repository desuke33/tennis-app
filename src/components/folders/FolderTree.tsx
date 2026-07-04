"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FolderNode } from "@/lib/types/domain";
import { deleteFolder, renameFolder } from "@/app/actions/folders";

function FolderTreeNode({
  node,
  depth,
  selectedId,
  isAdmin,
  isPending,
  onSelect,
  onDelete,
  onRename,
}: {
  node: FolderNode;
  depth: number;
  selectedId: string | null;
  isAdmin: boolean;
  isPending: boolean;
  onSelect: (id: string) => void;
  onDelete: (node: FolderNode) => void;
  onRename: (node: FolderNode, newName: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(node.name);

  const startEditing = () => {
    setDraftName(node.name);
    setIsEditing(true);
  };

  const commitEdit = () => {
    setIsEditing(false);
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === node.name) return;
    onRename(node, trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraftName(node.name);
      setIsEditing(false);
    }
  };

  return (
    <li>
      <div
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={`group flex items-center rounded ${
          selectedId === node.id
            ? "bg-blue-100 font-medium text-blue-800"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {isEditing ? (
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            autoFocus
            className="my-0.5 flex-1 rounded border border-blue-400 bg-white px-1 py-0.5 text-sm focus:outline-none"
          />
        ) : (
          <button
            onClick={() => onSelect(node.id)}
            className="flex-1 truncate py-1 text-left text-sm"
          >
            📁 {node.name}
          </button>
        )}
        {isAdmin && !isEditing && (
          <span className="flex shrink-0 items-center">
            <button
              onClick={startEditing}
              disabled={isPending}
              aria-label={`${node.name}の名前を変更`}
              className="rounded px-1.5 py-1 text-sm text-gray-500 hover:text-blue-600 disabled:opacity-50"
            >
              ✎
            </button>
            <button
              onClick={() => onDelete(node)}
              disabled={isPending}
              aria-label={`${node.name}を削除`}
              className="mr-1 rounded px-1.5 py-1 text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
            >
              ✕
            </button>
          </span>
        )}
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              isAdmin={isAdmin}
              isPending={isPending}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FolderTree({
  tree,
  isAdmin,
}: {
  tree: FolderNode[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("folder");
  const [isPending, startTransition] = useTransition();

  const handleSelect = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("folder", id);
    else params.delete("folder");
    router.push(`/?${params.toString()}`);
  };

  const handleDelete = (node: FolderNode) => {
    const hasChildren = node.children.length > 0;
    const message = hasChildren
      ? `「${node.name}」を削除しますか？中のサブフォルダも全て削除されます(ファイルは「すべて」に残ります)。この操作は取り消せません。`
      : `「${node.name}」を削除しますか？中のファイルは「すべて」に残ります。この操作は取り消せません。`;
    if (!confirm(message)) return;

    startTransition(async () => {
      try {
        await deleteFolder(node.id);
        if (selectedId === node.id) handleSelect(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : "削除に失敗しました");
      }
    });
  };

  const handleRename = (node: FolderNode, newName: string) => {
    startTransition(async () => {
      try {
        await renameFolder(node.id, newName);
      } catch (err) {
        alert(err instanceof Error ? err.message : "名前の変更に失敗しました");
      }
    });
  };

  return (
    <nav className="w-full">
      <button
        onClick={() => handleSelect(null)}
        className={`mb-1 block w-full truncate rounded px-2 py-1 text-left text-sm ${
          !selectedId
            ? "bg-blue-100 font-medium text-blue-800"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        🏠 すべて
      </button>
      <ul>
        {tree.map((node) => (
          <FolderTreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            isAdmin={isAdmin}
            isPending={isPending}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        ))}
      </ul>
    </nav>
  );
}
