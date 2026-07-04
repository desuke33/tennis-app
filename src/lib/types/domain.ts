import type { UserRole } from "./database.types";

export interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface FolderNode extends FolderRow {
  children: FolderNode[];
}

export interface TagRow {
  id: string;
  name: string;
}

export interface FileRow {
  id: string;
  name: string;
  folder_id: string | null;
  size: number;
  mime_type: string;
  created_at: string;
  tags: TagRow[];
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface AllowedEmailRow {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}
