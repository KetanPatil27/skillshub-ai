"use client";

import "./login.css";

import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, User as UserIcon, Sparkles, ArrowRight, UserPlus } from "lucide-react";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { useAuth, useSignupEmployee, useSignupHR } from "@/hooks/use-auth";
import { type LoginValues, loginSchema } from "@/lib/validations";

/* ──────────────────────── Floating Particles ──────────────────────── */
function FloatingParticles() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; duration: number; delay: number }[]
  >([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 8 + 6,
        delay: Math.random() * 5,
      })),
    );
  }, []);

  return (
    <div className="login-particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="login-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ──────────────────────── Main Login Page ──────────────────────── */
export default function LoginPage() {
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [signupRole, setSignupRole] = useState<"employee" | "hr">("employee");
  const [showManual, setShowManual] = useState(false);
  const manualRef = useRef<HTMLDivElement>(null);

  function toggleManual() {
    const next = !showManual;
    setShowManual(next);
    if (next) {
      setTimeout(() => {
        manualRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }
  const { login } = useAuth();
  const [demoBusy, setDemoBusy] = useState<"hr" | "emp" | null>(null);

  async function quickLogin(kind: "hr" | "emp") {
    setDemoBusy(kind);
    const creds =
      kind === "hr"
        ? { email: "hr@skillshub.demo", password: "demo123" }
        : { email: "ravi@skillshub.demo", password: "demo123" };
    const r = await login(creds.email, creds.password);
    if (!r.ok) toast.error(r.error);
    setDemoBusy(null);
  }

  return (
    <div className="login-page">
      <FloatingParticles />

      {/* Radial glow behind mascot */}
      <div className="login-glow" />

      <div className="login-container">


        {/* ── Title ── */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="login-title"
        >
          Welcome to <span className="login-title-accent">SkillsHub</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="login-subtitle"
        >
          AI-powered skills intelligence platform
        </motion.p>

        {/* ── Glass Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="login-card"
        >
          {/* Demo Quick Access */}
          <div className="login-demo-section">
            <div className="login-demo-header">
              <span className="login-demo-label">
                <Sparkles className="login-icon-tiny" />
                Quick Demo Access
              </span>
              <span className="login-demo-badge">For Judges</span>
            </div>

            <button
              type="button"
              onClick={() => quickLogin("hr")}
              disabled={demoBusy !== null}
              className="login-demo-btn login-demo-btn-primary"
              id="demo-hr-login"
            >
              {demoBusy === "hr" ? (
                <Loader2 className="login-icon-sm animate-spin" />
              ) : (
                <ShieldCheck className="login-icon-sm" />
              )}
              <span className="login-demo-btn-text">
                Login as HR (Demo)
              </span>
              <span className="login-demo-btn-email">hr@skillshub.demo</span>
            </button>

            <button
              type="button"
              onClick={() => quickLogin("emp")}
              disabled={demoBusy !== null}
              className="login-demo-btn login-demo-btn-secondary"
              id="demo-emp-login"
            >
              {demoBusy === "emp" ? (
                <Loader2 className="login-icon-sm animate-spin" />
              ) : (
                <UserIcon className="login-icon-sm" />
              )}
              <span className="login-demo-btn-text">
                Login as Employee (Demo)
              </span>
              <span className="login-demo-btn-email">ravi@skillshub.demo</span>
            </button>
          </div>

          {/* Divider toggle */}
          <button
            type="button"
            onClick={toggleManual}
            className="login-divider-toggle"
            id="toggle-manual-signin"
          >
            <div className="login-divider-line" />
            <span className="login-divider-text">
              {showManual ? "Hide" : "Show"} manual sign-in
            </span>
            <div className="login-divider-line" />
          </button>
          <div ref={manualRef} />

          {/* Manual sign-in / sign-up */}
          <AnimatePresence>
            {showManual && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {/* Tab switcher */}
                <div className="login-tabs">
                  <button
                    type="button"
                    onClick={() => setAuthTab("signin")}
                    className={`login-tab ${authTab === "signin" ? "login-tab-active" : ""}`}
                    id="tab-signin"
                  >
                    <LogIn className="login-icon-xs" />
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab("signup")}
                    className={`login-tab ${authTab === "signup" ? "login-tab-active" : ""}`}
                    id="tab-signup"
                  >
                    <UserPlus className="login-icon-xs" />
                    Create Account
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {authTab === "signin" ? (
                    <motion.div
                      key="signin"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <DarkSignInForm />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="signup"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SignupSection
                        signupRole={signupRole}
                        setSignupRole={setSignupRole}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="login-footer mt-8 text-center"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-white/20" />
            <p className="text-[13px] font-medium tracking-widest text-white/50">
              © 2026 ValueAddSoftTech
            </p>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-white/20" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ──────────────────────── Dark Sign In Form ──────────────────────── */
function DarkSignInForm() {
  const { login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onChange",
  });

  async function submit(values: LoginValues) {
    setBusy(true);
    const r = await login(values.email, values.password);
    if (!r.ok) toast.error(r.error);
    setBusy(false);
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} className="login-form">
      {/* Email */}
      <div className="login-field">
        <label htmlFor="signin-email" className="login-label">
          Email
        </label>
        <div className="login-input-wrap">
          <input
            id="signin-email"
            type="email"
            autoFocus
            autoComplete="email"
            placeholder="you@company.com"
            className="login-input"
            {...form.register("email")}
          />
        </div>
        {form.formState.errors.email && (
          <p className="login-error">{form.formState.errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="login-field">
        <label htmlFor="signin-password" className="login-label">
          Password
        </label>
        <div className="login-input-wrap">
          <input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="login-input login-input-password"
            {...form.register("password")}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="login-eye-btn"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="login-icon-sm" />
            ) : (
              <Eye className="login-icon-sm" />
            )}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="login-error">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      {/* Forgot password */}
      <div className="login-forgot-row">
        <button
          type="button"
          onClick={() =>
            toast.info(
              "Password reset isn't available in this demo. Use the demo accounts above.",
            )
          }
          className="login-forgot-link"
          id="forgot-password"
        >
          Forgot Password?
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={busy}
        className="login-submit"
        id="signin-submit"
      >
        {busy ? (
          <Loader2 className="login-icon-sm animate-spin" />
        ) : (
          <>
            SIGN IN
            <ArrowRight className="login-icon-sm" />
          </>
        )}
      </button>
    </form>
  );
}

/* ──────────────────────── Signup Section ──────────────────────── */
import { SignupEmployeeForm } from "@/components/features/auth/signup-employee-form";
import { SignupHRForm } from "@/components/features/auth/signup-hr-form";

function SignupSection({
  signupRole,
  setSignupRole,
}: {
  signupRole: "employee" | "hr";
  setSignupRole: (r: "employee" | "hr") => void;
}) {
  return (
    <div className="login-signup-section">
      <div className="login-role-switcher">
        <button
          type="button"
          onClick={() => setSignupRole("employee")}
          className={`login-role-btn ${signupRole === "employee" ? "login-role-btn-active" : ""}`}
          id="role-employee"
        >
          I&apos;m an Employee
        </button>
        <button
          type="button"
          onClick={() => setSignupRole("hr")}
          className={`login-role-btn ${signupRole === "hr" ? "login-role-btn-active" : ""}`}
          id="role-hr"
        >
          I&apos;m HR
        </button>
      </div>

      {signupRole === "employee" ? <SignupEmployeeForm /> : <SignupHRForm />}
    </div>
  );
}
