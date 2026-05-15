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
  // Cookie for middleware-side route protection.
  document.cookie = `skillshub_token=${token}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = "skillshub_token=; path=/; max-age=0";
}

export function homePathForRole(role: string | undefined): string {
  return role === "ADMIN" ? "/search" : "/profile";
}
