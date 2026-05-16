"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/shared/app-shell";
import { GlobalShortcuts } from "@/components/shared/global-shortcuts";

function MismatchNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("notice") === "role_mismatch") {
      toast.error("You were redirected — that area is for employees only");
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("notice");
      const newQuery = newParams.toString() ? `?${newParams.toString()}` : "";
      router.replace(pathname + newQuery);
    }
  }, [searchParams, router, pathname]);

  return null;
}

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="ADMIN">
      <Suspense fallback={null}>
        <MismatchNotice />
      </Suspense>
      <GlobalShortcuts />
      {children}
    </AppShell>
  );
}
