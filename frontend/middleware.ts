import { NextRequest, NextResponse } from "next/server";

const HR_ROUTES = ["/search", "/directory", "/review"];
const EMPLOYEE_ROUTES = ["/profile", "/upload"];
const PROTECTED = [...HR_ROUTES, ...EMPLOYEE_ROUTES];

function landingFor(role: string | undefined): string {
  return role === "ADMIN" ? "/search" : "/profile";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("skillshub_token")?.value;
  const role = req.cookies.get("skillshub_role")?.value;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (isProtected && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting /login or / — bounce to their landing page.
  if ((pathname === "/login" || pathname === "/") && token) {
    const url = req.nextUrl.clone();
    url.pathname = landingFor(role);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/search/:path*",
    "/directory/:path*",
    "/review/:path*",
    "/profile/:path*",
    "/upload/:path*",
  ],
};
