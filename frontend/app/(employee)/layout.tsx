"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/shared/app-shell";

function MismatchNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("notice") === "role_mismatch") {
      toast.error("You were redirected — that area is for HR only");
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("notice");
      const newQuery = newParams.toString() ? `?${newParams.toString()}` : "";
      router.replace(pathname + newQuery);
    }
  }, [searchParams, router, pathname]);

  return null;
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="USER">
      <Suspense fallback={null}>
        <MismatchNotice />
      </Suspense>
      {children}
    </AppShell>
  );
}
