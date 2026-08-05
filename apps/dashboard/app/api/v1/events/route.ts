import { NextResponse } from "next/server";
import { getPublicEvents } from "@/lib/data";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await validateApiKey(request, "events:read");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const events = await getPublicEvents();
  return NextResponse.json({ data: events });
}
