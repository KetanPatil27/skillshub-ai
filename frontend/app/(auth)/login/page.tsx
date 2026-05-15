"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles, ShieldCheck, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { type LoginValues, loginSchema } from "@/lib/validations";

const HR_DEMO = { email: "hr@skillshub.demo", password: "demo123" };
const EMP_DEMO = { email: "ravi@skillshub.demo", password: "demo123" };

export default function LoginPage() {
  const { login } = useAuth();
  const [busy, setBusy] = useState<"hr" | "emp" | "form" | null>(null);
  const [showManual, setShowManual] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function quickLogin(kind: "hr" | "emp") {
    setBusy(kind);
    const creds = kind === "hr" ? HR_DEMO : EMP_DEMO;
    const r = await login(creds.email, creds.password);
    if (!r.ok) toast.error(r.error);
    setBusy(null);
  }

  async function submit(values: LoginValues) {
    setBusy("form");
    const r = await login(values.email, values.password);
    if (!r.ok) toast.error(r.error);
    setBusy(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <div className="container flex min-h-screen flex-col items-center justify-center py-12">
        <div className="mb-8 flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="h-6 w-6 text-primary" />
          SkillsHub
        </div>
        <p className="mb-10 max-w-md text-center text-muted-foreground">
          Stop pinging ten managers asking "who knows React and has done payment
          integrations?" Just ask SkillsHub in plain English.
        </p>

        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 pt-6">
            <Button
              size="lg"
              className="h-14 w-full justify-start gap-3 text-base"
              onClick={() => quickLogin("hr")}
              disabled={busy !== null}
            >
              {busy === "hr" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
              Login as HR (Demo)
              <span className="ml-auto text-xs opacity-70">hr@skillshub.demo</span>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="h-14 w-full justify-start gap-3 text-base"
              onClick={() => quickLogin("emp")}
              disabled={busy !== null}
            >
              {busy === "emp" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
              Login as Employee (Demo)
              <span className="ml-auto text-xs opacity-70">ravi@skillshub.demo</span>
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowManual((v) => !v)}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {showManual ? "Hide manual sign-in" : "Or sign in manually"}
              </button>
            </div>

            {showManual && (
              <form
                onSubmit={form.handleSubmit(submit)}
                className="animate-fade-in space-y-3 border-t pt-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...form.register("password")} />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={busy !== null}>
                  {busy === "form" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-muted-foreground">
          Seeded demo accounts &mdash; one click and you&apos;re in.
        </p>
      </div>
    </div>
  );
}
