"use client";

import type { User } from "@/types";

const TOKEN_KEY = "skillshub_token";
const USER_KEY = "skillshub_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Cookies for middleware-side route protection. Role is set in a
  // separate non-HttpOnly cookie so the (Edge runtime) middleware can
  // route by role without decoding the JWT.
  const oneDay = 60 * 60 * 24;
  document.cookie = `skillshub_token=${token}; path=/; max-age=${oneDay}; samesite=lax`;
  document.cookie = `skillshub_role=${user.role}; path=/; max-age=${oneDay}; samesite=lax`;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = "skillshub_token=; path=/; max-age=0";
  document.cookie = "skillshub_role=; path=/; max-age=0";
}

export function homePathForRole(role: string | undefined): string {
  return role === "ADMIN" ? "/search" : "/profile";
}
