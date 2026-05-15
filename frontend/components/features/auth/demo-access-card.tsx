"use client";

import { Loader2, ShieldCheck, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const HR_DEMO = { email: "hr@skillshub.demo", password: "demo123" };
const EMP_DEMO = { email: "ravi@skillshub.demo", password: "demo123" };

export function DemoAccessCard() {
  const { login } = useAuth();
  const [busy, setBusy] = useState<"hr" | "emp" | null>(null);

  async function quickLogin(kind: "hr" | "emp") {
    setBusy(kind);
    const creds = kind === "hr" ? HR_DEMO : EMP_DEMO;
    const r = await login(creds.email, creds.password);
    if (!r.ok) toast.error(r.error);
    setBusy(null);
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Demo Access
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          For judges
        </span>
      </div>

      <Button
        size="lg"
        className="h-12 w-full justify-start gap-3"
        onClick={() => quickLogin("hr")}
        disabled={busy !== null}
      >
        {busy === "hr" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        Login as HR
        <span className="ml-auto text-xs opacity-70">hr@skillshub.demo</span>
      </Button>
      <Button
        variant="secondary"
        size="lg"
        className="h-12 w-full justify-start gap-3"
        onClick={() => quickLogin("emp")}
        disabled={busy !== null}
      >
        {busy === "emp" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserIcon className="h-4 w-4" />
        )}
        Login as Employee
        <span className="ml-auto text-xs opacity-70">ravi@skillshub.demo</span>
      </Button>
    </div>
  );
}
