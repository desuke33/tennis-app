import type { FolderNode, FolderRow } from "@/lib/types/domain";

export function buildFolderTree(folders: FolderRow[]): FolderNode[] {
  const nodeById = new Map<string, FolderNode>(
    folders.map((f) => [f.id, { ...f, children: [] }]),
  );
  const roots: FolderNode[] = [];

  nodeById.forEach((node) => {
    if (node.parent_id && nodeById.has(node.parent_id)) {
      nodeById.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
