import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/", "/login", "/register"];
const publicPrefixes = [
  "/api/auth",
  "/tools", // public lead-magnet tools
  "/guides", // public guides
  "/portal", // client portal (token-authenticated)
  "/api/tools",
  "/api/portal",
  "/api/webhooks",
  "/api/cron", // secured by CRON_SECRET inside the route
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname === path);
}

function hasPublicPrefix(pathname: string): boolean {
  return publicPrefixes.some((path) => pathname.startsWith(path));
}

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (hasPublicPrefix(pathname)) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", encodeURI(pathname));
    return NextResponse.redirect(loginUrl);
  }

  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
