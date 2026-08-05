import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

const auditFields = {
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    ...timestamps,
    ...auditFields,
  },
  (table) => [uniqueIndex("departments_slug_idx").on(table.slug)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    hierarchyLevel: integer("hierarchy_level").notNull().default(0),
    description: text("description"),
    ...timestamps,
    ...auditFields,
  },
  (table) => [uniqueIndex("roles_slug_idx").on(table.slug)],
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    module: text("module").notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [uniqueIndex("permissions_slug_idx").on(table.slug)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("role_permissions_role_idx").on(table.roleId),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    departmentId: uuid("department_id").references(() => departments.id),
    bio: text("bio"),
    phone: text("phone"),
    ...timestamps,
    ...auditFields,
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_department_idx").on(table.departmentId),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").references(() => users.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_roles_user_idx").on(table.userId),
  ],
);

export const navigationItems = pgTable(
  "navigation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    href: text("href").notNull(),
    icon: text("icon"),
    permissionSlug: text("permission_slug"),
    parentId: uuid("parent_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active").notNull().default(1),
    ...timestamps,
  },
  (table) => [index("navigation_items_sort_idx").on(table.sortOrder)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

export type Department = typeof departments.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type User = typeof users.$inferSelect;
export type NavigationItem = typeof navigationItems.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
