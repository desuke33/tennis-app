"use client";

import { useMemo, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FolderNode } from "@/lib/types/domain";
import { deleteFolder, renameFolder } from "@/app/actions/folders";

function FolderTreeNode({
  node,
  depth,
  selectedId,
  isAdmin,
  isPending,
  expandedIds,
  onSelect,
  onToggle,
  onDelete,
  onRename,
}: {
  node: FolderNode;
  depth: number;
  selectedId: string | null;
  isAdmin: boolean;
  isPending: boolean;
  expandedIds: Set<string>;
  onSelect: (node: FolderNode) => void;
  onToggle: (id: string) => void;
  onDelete: (node: FolderNode) => void;
  onRename: (node: FolderNode, newName: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(node.name);

  const hasChildren = node.children.length > 0;
  const isOpen = expandedIds.has(node.id);

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
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        className={`group flex items-center rounded ${
          selectedId === node.id
            ? "bg-blue-100 font-medium text-blue-800"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {/* 開閉トグル(子フォルダがある場合のみ) */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            aria-label={isOpen ? `${node.name}を閉じる` : `${node.name}を開く`}
            className="w-5 shrink-0 py-1 text-center text-xs text-gray-400"
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
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
            onClick={() => onSelect(node)}
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
      {hasChildren && isOpen && (
        <ul>
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              isAdmin={isAdmin}
              isPending={isPending}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// 選択中フォルダの祖先を求める(初期表示で選択フォルダまでのパスを開いておくため)
function collectAncestors(
  tree: FolderNode[],
  targetId: string | null,
): string[] {
  if (!targetId) return [];
  const path: string[] = [];
  const walk = (nodes: FolderNode[], trail: string[]): boolean => {
    for (const node of nodes) {
      if (node.id === targetId) {
        path.push(...trail, node.id);
        return true;
      }
      if (walk(node.children, [...trail, node.id])) return true;
    }
    return false;
  };
  walk(tree, []);
  return path;
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

  const initialExpanded = useMemo(
    () => new Set(collectAncestors(tree, selectedId)),
    // 初期表示時のみ評価(以降はユーザーの開閉操作を優先)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(initialExpanded);

  const navigateTo = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("folder", id);
    else params.delete("folder");
    router.push(`/?${params.toString()}`);
  };

  // フォルダ名をタップ: 選択 + 下位の階層を開く
  const handleSelect = (node: FolderNode) => {
    navigateTo(node.id);
    if (node.children.length > 0) {
      setExpandedIds((prev) => new Set(prev).add(node.id));
    }
  };

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
        if (selectedId === node.id) navigateTo(null);
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
        onClick={() => navigateTo(null)}
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
            expandedIds={expandedIds}
            onSelect={handleSelect}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onRename={handleRename}
          />
        ))}
      </ul>
    </nav>
  );
}
