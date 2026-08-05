import { NextResponse } from "next/server";
import { getPublicProjects } from "@/lib/data";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await validateApiKey(request, "projects:read");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const projects = await getPublicProjects();
  return NextResponse.json({ data: projects });
}
