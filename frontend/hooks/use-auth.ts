"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api";
import { clearSession, getStoredUser, homePathForRole, setSession } from "@/lib/auth";
import type {
  EmployeeSignupValues,
  HRSignupValues,
} from "@/lib/validations";
import type {
  Employee,
  LoginResponse,
  RegisterResponse,
  User,
} from "@/types";

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
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      setSession(data.access_token, data.user);
      setUser(data.user);

      const next = await landingPathAfterLogin(data);
      router.replace(next);
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

/**
 * Returning USERs land on /upload if their stub profile is still empty, else
 * /profile. ADMINs always land on /search. We can't know skill count from the
 * login response alone, so we make one optional follow-up call to /employees/me.
 */
async function landingPathAfterLogin(data: LoginResponse): Promise<string> {
  if (data.user.role !== "USER") return homePathForRole(data.user.role);
  try {
    const { data: emp } = await api.get<Employee>("/employees/me");
    const empty = (emp.skills?.length ?? 0) === 0 && emp.status !== "APPROVED";
    return empty ? "/upload" : "/profile";
  } catch {
    return "/upload";
  }
}

// ─── Signup mutations ─────────────────────────────────────────────────────────

export function useSignupEmployee() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vals: EmployeeSignupValues): Promise<RegisterResponse> => {
      const { data } = await api.post<RegisterResponse>(
        "/auth/register/employee",
        {
          name: vals.name.trim(),
          email: vals.email.trim().toLowerCase(),
          password: vals.password,
          confirm_password: vals.confirm_password,
        },
      );
      return data;
    },
    onSuccess: (data) => {
      setSession(data.access_token, data.user);
      qc.invalidateQueries({ queryKey: ["me"] });
      router.replace(data.next_action === "upload_resume" ? "/upload" : "/search");
    },
  });
}

export function useSignupHR() {
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vals: HRSignupValues): Promise<RegisterResponse> => {
      const { data } = await api.post<RegisterResponse>("/auth/register/hr", {
        name: vals.name.trim(),
        email: vals.email.trim().toLowerCase(),
        password: vals.password,
        confirm_password: vals.confirm_password,
        invite_code: vals.invite_code,
      });
      return data;
    },
    onSuccess: (data) => {
      setSession(data.access_token, data.user);
      qc.invalidateQueries({ queryKey: ["me"] });
      router.replace("/search");
    },
  });
}
