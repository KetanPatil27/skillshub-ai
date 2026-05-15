"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { HelpCircle, Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PasswordStrengthIndicator } from "@/components/features/auth/password-strength-indicator";
import { SignupOverlay } from "@/components/features/auth/signup-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSignupHR } from "@/hooks/use-auth";
import { type HRSignupValues, hrSignupSchema } from "@/lib/validations";
import { generateStrongPassword } from "@/lib/utils";

export function SignupHRForm() {
  const signup = useSignupHR();

  const form = useForm<HRSignupValues>({
    resolver: zodResolver(hrSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirm_password: "",
      invite_code: "",
    },
    mode: "onChange",
  });
  const { register, handleSubmit, watch, setError, formState, setValue } = form;
  const password = watch("password");

  async function onSubmit(values: HRSignupValues) {
    try {
      await signup.mutateAsync(values);
    } catch (err) {
      mapHRErrorToForm(err, setError);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="hr-name">Full name</Label>
          <Input
            id="hr-name"
            autoFocus
            autoComplete="name"
            placeholder="e.g. Priya HR"
            {...register("name")}
          />
          {formState.errors.name && (
            <p className="text-xs text-destructive">{formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hr-email">Work email</Label>
          <Input
            id="hr-email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
          />
          {formState.errors.email && (
            <p className="text-xs text-destructive">{formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="hr-password">Password</Label>
            <button
              type="button"
              onClick={() => {
                const p = generateStrongPassword();
                setValue("password", p, { shouldValidate: true, shouldDirty: true });
                setValue("confirm_password", p, { shouldValidate: true, shouldDirty: true });
                toast.success("Strong password generated");
              }}
              className="text-[10px] text-primary hover:underline"
            >
              Suggest strong password
            </button>
          </div>
          <Input
            id="hr-password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          <PasswordStrengthIndicator value={password ?? ""} />
          {formState.errors.password && (
            <p className="text-xs text-destructive">
              {formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hr-confirm">Confirm password</Label>
          <Input
            id="hr-confirm"
            type="password"
            autoComplete="new-password"
            {...register("confirm_password")}
          />
          {formState.errors.confirm_password && (
            <p className="text-xs text-destructive">
              {formState.errors.confirm_password.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="hr-invite">Invite code</Label>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="What's an invite code?"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Ask your admin for an invite code. For this demo, the code is in
                  the README.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="hr-invite"
            placeholder="SKILLSHUB-HR-2026"
            spellCheck={false}
            {...register("invite_code")}
          />
          {formState.errors.invite_code && (
            <p className="text-xs text-destructive">
              {formState.errors.invite_code.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={signup.isPending}>
          {signup.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Create HR Account
        </Button>
      </form>

      {signup.isPending && (
        <SignupOverlay
          title="Creating your HR account…"
          subtitle="One moment — we'll drop you straight into search."
        />
      )}
    </>
  );
}

function mapHRErrorToForm(
  err: unknown,
  setError: (n: any, e: { message: string }) => void,
) {
  if (!axios.isAxiosError(err)) {
    toast.error("Something went wrong. Please try again.");
    return;
  }
  const status = err.response?.status;
  const data = err.response?.data as any;
  const message: string = data?.message ?? "";

  if (status === 409) {
    toast.error("An account with this email already exists. Try signing in instead.");
    setError("email", { message: "Email already registered" });
    return;
  }
  if (status === 403 && message.toLowerCase().includes("invite")) {
    setError("invite_code", { message: "Invalid invite code." });
    return;
  }
  if (status === 403) {
    toast.error(message || "Signup is currently disabled.");
    return;
  }
  if (status === 422 && Array.isArray(data?.details)) {
    let matched = false;
    for (const d of data.details) {
      const field = d?.loc?.[d.loc.length - 1];
      if (typeof field === "string" && field !== "body") {
        setError(field as any, { message: d.msg || "Invalid value" });
        matched = true;
      }
    }
    if (!matched) toast.error("Please check the form for errors.");
    return;
  }
  toast.error("Something went wrong. Please try again.");
}
