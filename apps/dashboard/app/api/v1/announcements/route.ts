import { NextResponse } from "next/server";
import { createAdminClient } from "@kitsic/database";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await validateApiKey(request, "events:read");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, content, is_pinned, created_at")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return NextResponse.json({ data: data ?? [] });
}
