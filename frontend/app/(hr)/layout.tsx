import { AppShell } from "@/components/shared/app-shell";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="ADMIN">{children}</AppShell>;
}
