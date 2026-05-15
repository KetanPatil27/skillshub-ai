"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api";
import { clearSession, getStoredUser, homePathForRole, setSession } from "@/lib/auth";
import type { TokenResponse, User } from "@/types";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setHydrated(true);
  }, []);

  async function login(email: string, password: string) {
    try {
      const { data } = await api.post<TokenResponse>("/auth/login", { email, password });
      setSession(data.access_token, data.user);
      setUser(data.user);
      router.replace(homePathForRole(data.user.role));
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: errorMessage(e) };
    }
  }

  function logout() {
    clearSession();
    setUser(null);
    router.replace("/login");
  }

  return { user, hydrated, login, logout };
}
