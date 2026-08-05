import { createAdminClient } from "./supabase-admin";

interface AuditEventInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditEvent(input: AuditEventInput) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("audit_logs").insert({
    user_id: input.userId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });

  if (error) {
    console.error("Failed to write audit log:", error.message);
  }
}
