import "./load-env";
import { createAdminClient } from "./supabase-admin";
import {
  DEPARTMENTS,
  NAVIGATION,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
} from "./seed-data";

async function seed() {
  const supabase = createAdminClient();

  console.log("Seeding departments...");
  const { error: deptError } = await supabase
    .from("departments")
    .upsert([...DEPARTMENTS], { onConflict: "slug" });
  if (deptError) throw deptError;

  console.log("Seeding roles...");
  const { error: rolesError } = await supabase
    .from("roles")
    .upsert([...ROLES], { onConflict: "slug" });
  if (rolesError) throw rolesError;

  console.log("Seeding permissions...");
  const { error: permsError } = await supabase
    .from("permissions")
    .upsert([...PERMISSIONS], { onConflict: "slug" });
  if (permsError) throw permsError;

  const { data: allRoles, error: fetchRolesError } = await supabase
    .from("roles")
    .select("id, slug");
  if (fetchRolesError) throw fetchRolesError;

  const { data: allPerms, error: fetchPermsError } = await supabase
    .from("permissions")
    .select("id, slug");
  if (fetchPermsError) throw fetchPermsError;

  const roleMap = new Map(allRoles.map((r) => [r.slug, r.id]));
  const permMap = new Map(allPerms.map((p) => [p.slug, p.id]));

  console.log("Seeding role permissions...");
  const rolePermissionRows = [];
  for (const [roleSlug, permSlugs] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleSlug);
    if (!roleId) continue;

    for (const permSlug of permSlugs) {
      const permId = permMap.get(permSlug);
      if (!permId) continue;
      rolePermissionRows.push({ role_id: roleId, permission_id: permId });
    }
  }

  if (rolePermissionRows.length > 0) {
    const { error: rpError } = await supabase
      .from("role_permissions")
      .upsert(rolePermissionRows, { onConflict: "role_id,permission_id" });
    if (rpError) throw rpError;
  }

  console.log("Seeding navigation...");
  for (const item of NAVIGATION) {
    const { data: existing } = await supabase
      .from("navigation_items")
      .select("id")
      .eq("href", item.href)
      .maybeSingle();

    const row = { ...item, is_active: 1 };

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("navigation_items")
        .update(row)
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("navigation_items").insert(row);
      if (insertError) throw insertError;
    }
  }

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
