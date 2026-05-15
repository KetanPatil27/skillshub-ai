"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Loader2, UserPlus } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PasswordStrengthIndicator } from "@/components/features/auth/password-strength-indicator";
import { SignupOverlay } from "@/components/features/auth/signup-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignupEmployee } from "@/hooks/use-auth";
import {
  type EmployeeSignupValues,
  employeeSignupSchema,
} from "@/lib/validations";
import { generateStrongPassword } from "@/lib/utils";

export function SignupEmployeeForm() {
  const signup = useSignupEmployee();
  const nameRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<EmployeeSignupValues>({
    resolver: zodResolver(employeeSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirm_password: "",
      terms: undefined as unknown as true,
    },
    mode: "onChange",
  });
  const { register, handleSubmit, watch, setError, formState, setValue } = form;
  const password = watch("password");
  const terms = watch("terms");

  async function onSubmit(values: EmployeeSignupValues) {
    try {
      await signup.mutateAsync(values);
    } catch (err) {
      mapErrorToForm(err, setError);
    }
  }

  const { ref: nameInnerRef, ...nameRest } = register("name");

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="emp-name">Full name</Label>
          <Input
            id="emp-name"
            autoFocus
            autoComplete="name"
            placeholder="e.g. Asha Iyer"
            {...nameRest}
            ref={(el) => {
              nameInnerRef(el);
              nameRef.current = el;
            }}
          />
          {formState.errors.name && (
            <p className="text-xs text-destructive">{formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="emp-email">Email</Label>
          <Input
            id="emp-email"
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
            <Label htmlFor="emp-password">Password</Label>
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
            id="emp-password"
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
          <Label htmlFor="emp-confirm">Confirm password</Label>
          <Input
            id="emp-confirm"
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

        <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-3.5 w-3.5 cursor-pointer rounded border-input accent-primary"
            {...register("terms")}
          />
          <span>
            I agree to the demo terms — this account exists for evaluation only.
          </span>
        </label>
        {formState.errors.terms && (
          <p className="text-xs text-destructive">{formState.errors.terms.message}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={!terms || signup.isPending}
        >
          {signup.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Create Employee Account
        </Button>
      </form>

      {signup.isPending && (
        <SignupOverlay
          title="Creating your account…"
          subtitle="Setting up your profile — you'll upload your resume in a moment."
        />
      )}
    </>
  );
}

function mapErrorToForm(
  err: unknown,
  setError: (n: any, e: { message: string }) => void,
) {
  if (!axios.isAxiosError(err)) {
    toast.error("Something went wrong. Please try again.");
    return;
  }
  const status = err.response?.status;
  const data = err.response?.data as any;

  if (status === 409) {
    toast.error("An account with this email already exists. Try signing in instead.");
    setError("email", { message: "Email already registered" });
    return;
  }
  if (status === 403) {
    toast.error(data?.message || "Signup is currently disabled.");
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
