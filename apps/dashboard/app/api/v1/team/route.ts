import { NextResponse } from "next/server";
import { getPublicTeam } from "@/lib/data";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await validateApiKey(request, "team:read");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const team = await getPublicTeam();
  return NextResponse.json({ data: team });
}
