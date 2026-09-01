import { updateSession } from "@kitsic/auth/middleware";
import { type NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/login", "/signup", "/signup/leadership", "/auth/callback", "/auth/confirm"];

function isPublicPath(pathname: string) {
  if (publicRoutes.some((route) => pathname.startsWith(route))) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/health")) return true;
  if (pathname.startsWith("/api/google/callback")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  // Allow Next.js server actions (POST with Next-Action header) through without redirects
  if (request.method === "POST" && request.headers.has("next-action")) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublicRoute = isPublicPath(pathname);

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/signup/leadership")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
