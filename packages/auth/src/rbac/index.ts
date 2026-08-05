import { createAdminClient } from "@kitsic/database";
import { ForbiddenError, UnauthorizedError } from "@kitsic/utils";
import type { NavItem, SessionUser } from "@kitsic/types";
import { createClient } from "../clients/server";

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users")
    .select("email, full_name, avatar_url, avatar_color, member_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: userRolesList } = await admin
    .from("user_roles")
    .select("roles(slug)")
    .eq("user_id", user.id);

  const roles = (userRolesList ?? [])
    .map((row) => {
      const role = row.roles as { slug: string } | { slug: string }[] | null;
      if (Array.isArray(role)) return role[0]?.slug;
      return role?.slug;
    })
    .filter((slug): slug is string => Boolean(slug));

  const permissions = await getUserPermissions(user.id);

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? "",
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    avatarColor: (profile?.avatar_color as string | null) ?? "#033565",
    memberId: (profile?.member_id as string | null) ?? null,
    roles,
    permissions,
  };
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const admin = createAdminClient();

  const { data: userRolesList } = await admin
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);

  if (!userRolesList?.length) return [];

  const roleIds = userRolesList.map((r) => r.role_id);

  const { data: rolePerms } = await admin
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", roleIds);

  if (!rolePerms?.length) return [];

  const permIds = rolePerms.map((rp) => rp.permission_id);

  const { data: perms } = await admin
    .from("permissions")
    .select("slug")
    .in("id", permIds);

  return [...new Set((perms ?? []).map((p) => p.slug))];
}

export async function checkPermission(
  userId: string,
  permission: string,
): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  if (perms.includes(permission)) return true;

  const admin = createAdminClient();
  const { data: userRolesList } = await admin
    .from("user_roles")
    .select("roles(slug)")
    .eq("user_id", userId);

  return (userRolesList ?? []).some((row) => {
    const role = row.roles as { slug: string } | { slug: string }[] | null;
    const slug = Array.isArray(role) ? role[0]?.slug : role?.slug;
    return slug === "president";
  });
}

export async function requirePermission(permission: string): Promise<SessionUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new UnauthorizedError();
  }

  const hasPermission = await checkPermission(sessionUser.id, permission);
  if (!hasPermission) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return sessionUser;
}

export async function getNavigationForUser(userId: string): Promise<NavItem[]> {
  const admin = createAdminClient();
  const userPerms = await getUserPermissions(userId);

  const { data: items } = await admin
    .from("navigation_items")
    .select("*")
    .eq("is_active", 1)
    .order("sort_order", { ascending: true });

  return (items ?? [])
    .filter((item) => {
      if (!item.permission_slug) return true;
      return userPerms.includes(item.permission_slug);
    })
    .map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      icon: item.icon,
      permissionSlug: item.permission_slug,
      parentId: item.parent_id,
      sortOrder: item.sort_order,
    }));
}
