import { NextResponse } from "next/server";
import { getSessionUser } from "@kitsic/auth";
import { globalSearch } from "@/lib/data";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ members: [], tasks: [], events: [], projects: [], announcements: [] });
  }

  const results = await globalSearch(q);
  return NextResponse.json(results);
}
