"use client";

import { useCallback, useEffect } from "react";
import { Briefcase, MapPin, Printer, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Avatar } from "@/components/shared/avatar";
import { SkillPill } from "@/components/shared/skill-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployee } from "@/hooks/use-employees";
import { allocationTone, cn } from "@/lib/utils";

export function EmployeeSheet({
  employeeId,
  open,
  onOpenChange,
}: {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: emp, isLoading } = useEmployee(employeeId ?? undefined);

  useEffect(() => {
    if (emp) {
      const recent = JSON.parse(localStorage.getItem("recent_employees") || "[]");
      const filtered = recent.filter((r: any) => r.id !== emp.id);
      const next = [{ id: emp.id, name: emp.full_name, headline: emp.headline }, ...filtered].slice(0, 10);
      localStorage.setItem("recent_employees", JSON.stringify(next));
      window.dispatchEvent(new Event("recent_employees_updated"));
    }
  }, [emp]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto print-region print:max-h-none print:shadow-none print:border-none">
        {isLoading || !emp ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <Avatar name={emp.full_name} size={56} />
                <div className="flex-1">
                  <DialogTitle>{emp.full_name}</DialogTitle>
                  <DialogDescription>{emp.headline}</DialogDescription>
                </div>
                <AllocationBadge status={emp.allocation_status} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="no-print shrink-0"
                  title={emp.has_resume ? "View Original Resume" : "Print Profile"}
                  onClick={async () => {
                    if (emp.has_resume) {
                      try {
                        const res = await api.get(`/employees/${emp.id}/resume`, {
                          responseType: "blob",
                        });
                        const blob = new Blob([res.data], { type: "application/pdf" });
                        const url = URL.createObjectURL(blob);
                        window.open(url, "_blank");
                        // Clean up the blob URL after a short delay
                        setTimeout(() => URL.revokeObjectURL(url), 30000);
                      } catch {
                        window.print();
                      }
                    } else {
                      window.print();
                    }
                  }}
                >
                  {emp.has_resume ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <Printer className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Info icon={<MapPin className="h-3.5 w-3.5" />} label="Location">
                {emp.location ?? "—"}
              </Info>
              <Info icon={<Briefcase className="h-3.5 w-3.5" />} label="Experience">
                {emp.years_experience ? `${emp.years_experience} years` : "—"}
              </Info>
              <Info label="Status">
                <Badge variant="muted">{emp.status}</Badge>
              </Info>
            </div>

            {emp.bio && <p className="text-sm text-muted-foreground">{emp.bio}</p>}

            <section>
              <h4 className="mb-2 text-sm font-semibold">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {emp.skills.map((s) => (
                  <SkillPill key={(s.id ?? s.name) + ""} skill={s} />
                ))}
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold">Projects</h4>
              <div className="space-y-3">
                {emp.projects.map((p) => (
                  <div key={(p.id ?? p.title) + ""} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.start_date ?? "?"} – {p.end_date ?? "Present"}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.role}
                      {p.role && p.domain && " · "}
                      {p.domain}
                    </div>
                    {p.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(p.tech_stack ?? []).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {emp.projects.length === 0 && (
                  <p className="text-sm text-muted-foreground">No projects.</p>
                )}
              </div>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Info({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function AllocationBadge({ status }: { status: string }) {
  const tone = allocationTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs",
        tone.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {tone.label}
    </span>
  );
}
