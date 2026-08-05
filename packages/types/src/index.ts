export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string | null;
  permissionSlug: string | null;
  parentId: string | null;
  sortOrder: number;
  children?: NavItem[];
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  departmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  slug: string;
  name: string;
  hierarchyLevel: number;
}

export interface Permission {
  id: string;
  slug: string;
  name: string;
  module: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  avatarColor: string;
  memberId: string | null;
  roles: string[];
  permissions: string[];
}

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "INTERNAL";
