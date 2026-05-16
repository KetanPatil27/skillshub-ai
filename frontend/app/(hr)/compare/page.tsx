"use client";

import { useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Briefcase } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/shared/avatar";
import { SkillPill } from "@/components/shared/skill-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployee } from "@/hooks/use-employees";
import { allocationTone, cn } from "@/lib/utils";

function CandidateColumn({ id }: { id: string }) {
  const { data: emp, isLoading } = useEmployee(id);

  if (isLoading || !emp) {
    return (
      <Card className="flex-1">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const tone = allocationTone(emp.allocation_status);

  return (
    <Card className="flex-1 overflow-hidden flex flex-col">
      <CardHeader className="bg-muted/30 pb-4 border-b space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={emp.full_name} size={64} />
          <div>
            <CardTitle>{emp.full_name}</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">{emp.headline}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1 font-normal">
            <MapPin className="h-3 w-3" /> {emp.location || "N/A"}
          </Badge>
          <Badge variant="outline" className="gap-1 font-normal">
            <Briefcase className="h-3 w-3" /> {emp.years_experience ? `${emp.years_experience} yrs` : "N/A"}
          </Badge>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-background px-2 border py-0.5",
              tone.text
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
            {tone.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-1 overflow-y-auto space-y-6">
        <section>
          <h4 className="font-semibold mb-3 text-sm">Skills</h4>
          <div className="flex flex-wrap gap-2">
            {emp.skills.map(s => <SkillPill key={(s.id ?? s.name)+""} skill={s} />)}
          </div>
        </section>
        <section>
          <h4 className="font-semibold mb-3 text-sm">Projects</h4>
          <div className="space-y-4">
            {emp.projects.map(p => (
              <div key={(p.id ?? p.title)+""} className="border-l-2 pl-3 pb-2 text-sm">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground mb-1">
                  {p.role} {p.domain && `· ${p.domain}`}
                </div>
                {p.description && <p className="text-muted-foreground text-xs leading-relaxed">{p.description}</p>}
              </div>
            ))}
            {emp.projects.length === 0 && <span className="text-sm text-muted-foreground">No projects.</span>}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

import { Suspense } from "react";

function CompareContent() {
  const params = useSearchParams();
  const ids = params.get("ids")?.split(",").filter(Boolean) || [];

  return (
    <div className="container py-8 max-w-[1200px] h-[calc(100vh-2rem)] flex flex-col">
      <header className="mb-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/directory"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Compare Candidates</h1>
            <p className="text-sm text-muted-foreground">Side-by-side comparison</p>
          </div>
        </div>
      </header>

      {ids.length < 2 ? (
        <div className="flex-1 flex items-center justify-center border rounded-lg bg-muted/20">
          <p className="text-muted-foreground text-sm">Select at least 2 candidates to compare.</p>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 overflow-hidden">
          {ids.map(id => <CandidateColumn key={id} id={id} />)}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="p-8">Loading compare page...</div>}>
      <CompareContent />
    </Suspense>
  );
}
