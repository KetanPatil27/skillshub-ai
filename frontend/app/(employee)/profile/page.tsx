"use client";

import { Pencil, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import {
  ProfileEditor,
  type ProfileEditorState,
} from "@/components/features/resume-upload/profile-editor";
import { Avatar } from "@/components/shared/avatar";
import { SkillPill } from "@/components/shared/skill-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMyProfile,
  useReplaceProjects,
  useReplaceSkills,
  useUpdateEmployee,
} from "@/hooks/use-employees";
import { errorMessage } from "@/lib/api";
import { allocationTone, cn } from "@/lib/utils";

export default function ProfilePage() {
  const { data: emp, isLoading, error } = useMyProfile();
  const [editing, setEditing] = useState(false);

  const update = useUpdateEmployee(emp?.id ?? "");
  const skills = useReplaceSkills(emp?.id ?? "");
  const projects = useReplaceProjects(emp?.id ?? "");

  async function save(state: ProfileEditorState) {
    if (!emp) return;
    try {
      await update.mutateAsync({
        full_name: state.full_name,
        headline: state.headline,
        location: state.location,
        years_experience:
          state.years_experience === "" ? null : Number(state.years_experience),
        bio: state.bio,
        allocation_status: state.allocation_status,
      } as any);
      await skills.mutateAsync(state.skills);
      await projects.mutateAsync(state.projects);
      toast.success("Profile updated.");
      setEditing(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-10 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className="container max-w-md py-16 text-center">
        <h2 className="mb-2 text-xl font-semibold">No profile yet</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Upload your resume and we&apos;ll build your profile automatically.
        </p>
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" /> Upload resume
          </Link>
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="container max-w-3xl py-10">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Edit profile</h1>
          <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </header>
        <ProfileEditor
          employee={emp}
          onSubmit={save}
          primaryLabel="Save changes"
          submitting={update.isPending || skills.isPending || projects.isPending}
        />
      </div>
    );
  }

  const tone = allocationTone(emp.allocation_status);

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My profile</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/upload"><Upload className="mr-2 h-4 w-4" /> Re-upload</Link>
          </Button>
          <Button onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar name={emp.full_name} size={56} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{emp.full_name}</h2>
              <Badge variant="muted">{emp.status}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">{emp.headline}</div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {emp.location && <span>{emp.location}</span>}
              {emp.years_experience !== null && <span>{emp.years_experience} years experience</span>}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5",
                  tone.text,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
                {tone.label}
              </span>
            </div>
            {emp.bio && <p className="mt-3 text-sm text-muted-foreground">{emp.bio}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {emp.skills.map((s, i) => (
              <SkillPill key={s.id ?? i} skill={s} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-semibold">Projects</h3>
          <div className="space-y-3">
            {emp.projects.map((p, i) => (
              <div key={p.id ?? i} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.start_date ?? "?"} – {p.end_date ?? "Present"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {p.role}{p.role && p.domain && " · "}{p.domain}
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
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
