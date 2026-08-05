import { createAdminClient } from "@kitsic/database";

export async function validateApiKey(request: Request, requiredScope: string) {
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");
  const rawKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : apiKeyHeader;

  if (!rawKey) {
    return { valid: false as const, error: "Missing API key" };
  }

  const supabase = createAdminClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, key_hash, scopes, is_active")
    .eq("is_active", true);

  const match = keys?.find((k) => k.key_hash === rawKey);
  if (!match) {
    return { valid: false as const, error: "Invalid API key" };
  }

  if (!match.scopes.includes(requiredScope)) {
    return { valid: false as const, error: "Insufficient scope" };
  }

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", match.id);

  return { valid: true as const };
}
