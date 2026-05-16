"use client";

import { BarChart3, FileUp, LogOut, Moon, Search, Sparkles, Sun, Upload, Users, Inbox, UserCircle, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useReviewQueue } from "@/hooks/use-review-queue";
import { cn } from "@/lib/utils";

function ReviewBadge() {
  const { data } = useReviewQueue();
  if (!data?.total) return null;
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground">
      {data.total}
    </span>
  );
}

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const HR_NAV: NavItem[] = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/directory", label: "Directory", icon: Users },
  { href: "/review", label: "Review Queue", icon: Inbox },
  { href: "/bulk-upload", label: "Bulk Upload", icon: FileUp },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const EMP_NAV: NavItem[] = [
  { href: "/profile", label: "My Profile", icon: UserCircle },
  { href: "/upload", label: "Upload Resume", icon: Upload },
];

export function AppShell({
  role,
  children,
}: {
  role: "ADMIN" | "USER";
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const nav = role === "ADMIN" ? HR_NAV : EMP_NAV;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-card/40 md:flex md:flex-col">
        <div className="flex items-center gap-2 px-6 py-5 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          SkillsHub
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((n) => {
            const active = pathname.startsWith(n.href);
            const Icon = n.icon;
            const isReview = n.label === "Review Queue";
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{n.label}</span>
                {isReview && <ReviewBadge />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 text-sm">
          <div className="mb-1 truncate font-medium">{user?.name ?? "—"}</div>
          <div className="mb-3 truncate text-xs text-muted-foreground">{user?.email}</div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="flex-1 justify-start" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Button variant="ghost" size="icon" />;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
