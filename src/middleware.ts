import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/", "/login", "/register"];
const authApiPaths = ["/api/auth"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname === path);
}

function isAuthApiPath(pathname: string): boolean {
  return authApiPaths.some((path) => pathname.startsWith(path));
}

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public assets and Next.js internals
  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  // Allow auth API routes (login, register, callbacks, etc.)
  if (isAuthApiPath(pathname)) {
    return NextResponse.next();
  }

  // Allow public pages
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check authentication for all other routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect unauthenticated users to login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", encodeURI(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users trying to access auth pages - redirect to dashboard
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
