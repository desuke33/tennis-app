export type UserRole = "admin" | "member";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          role?: UserRole;
        };
        Update: {
          email?: string;
          name?: string | null;
          role?: UserRole;
        };
        Relationships: [];
      };
      allowed_emails: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          added_by: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          role?: UserRole;
          added_by?: string | null;
        };
        Update: {
          email?: string;
          role?: UserRole;
        };
        Relationships: [];
      };
      folders: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          name: string;
          parent_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          parent_id?: string | null;
        };
        Relationships: [];
      };
      files: {
        Row: {
          id: string;
          name: string;
          storage_path: string;
          folder_id: string | null;
          size: number;
          mime_type: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          storage_path: string;
          folder_id?: string | null;
          size: number;
          mime_type: string;
          uploaded_by?: string | null;
        };
        Update: {
          name?: string;
          folder_id?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          name: string;
          created_by?: string | null;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      file_tags: {
        Row: {
          file_id: string;
          tag_id: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          file_id: string;
          tag_id: string;
          created_by?: string | null;
        };
        Update: {
          file_id?: string;
          tag_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
