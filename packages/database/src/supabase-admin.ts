import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, requireServiceRoleKey } from "./load-env";

export function createAdminClient() {
  return createClient(getSupabaseUrl(), requireServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
