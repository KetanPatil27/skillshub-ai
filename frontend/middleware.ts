import { NextRequest, NextResponse } from "next/server";

const HR_ROUTES = ["/search", "/directory", "/review"];
const EMPLOYEE_ROUTES = ["/profile", "/upload"];
const PROTECTED = [...HR_ROUTES, ...EMPLOYEE_ROUTES];

// Middleware is a UX guard, not a security boundary. The backend re-verifies on every API call.
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("skillshub_token")?.value;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));

  // 1. Unauthenticated user hitting a protected route -> /login
  if (isProtected && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (!token) {
    return NextResponse.next();
  }

  const payload = decodeJwt(token);
  if (!payload || !payload.role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    res.cookies.delete("skillshub_token");
    res.cookies.delete("skillshub_role");
    return res;
  }

  const role = payload.role;

  // 2. Authenticated user hitting /login or / -> their role landing
  if (pathname === "/login" || pathname === "/") {
    const url = req.nextUrl.clone();
    if (role === "ADMIN") {
      url.pathname = "/search";
    } else {
      let hasCompletedProfile = false;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          hasCompletedProfile = data.has_completed_profile;
        }
      } catch (e) {
        // Ignore fetch errors
      }
      url.pathname = hasCompletedProfile ? "/profile" : "/upload";
    }
    return NextResponse.redirect(url);
  }

  // 3. Role mismatch on protected routes -> bounce to their landing
  if (role !== "ADMIN" && startsWithAny(pathname, HR_ROUTES)) {
    const url = req.nextUrl.clone();
    url.pathname = "/profile";
    url.searchParams.set("notice", "role_mismatch");
    return NextResponse.redirect(url);
  }

  if (role === "ADMIN" && startsWithAny(pathname, EMPLOYEE_ROUTES)) {
    const url = req.nextUrl.clone();
    url.pathname = "/search";
    url.searchParams.set("notice", "role_mismatch");
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
