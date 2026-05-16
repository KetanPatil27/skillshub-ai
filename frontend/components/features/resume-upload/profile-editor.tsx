"use client";

import { motion } from "framer-motion";
import { Briefcase, Check, MapPin, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/shared/avatar";
import { ProfileCompletenessMeter } from "@/components/shared/profile-completeness-meter";
import { SkillPill } from "@/components/shared/skill-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { cn } from "@/lib/utils";
import type { Employee, Project, Skill } from "@/types";

const CATEGORIES: Skill["category"][] = ["LANGUAGE", "FRAMEWORK", "PLATFORM", "TOOL", "DOMAIN"];

export interface ProfileEditorState {
  full_name: string;
  headline: string;
  location: string;
  years_experience: number | "";
  bio: string;
  allocation_status: Employee["allocation_status"];
  skills: Skill[];
  projects: Project[];
}

export function toEditorState(employee: Employee): ProfileEditorState {
  return {
    full_name: employee.full_name ?? "",
    headline: employee.headline ?? "",
    location: employee.location ?? "",
    years_experience: employee.years_experience ?? "",
    bio: employee.bio ?? "",
    allocation_status: employee.allocation_status,
    skills: employee.skills.map((s) => ({ ...s })),
    projects: employee.projects.map((p) => ({ ...p })),
  };
}

export function ProfileEditor({
  employee,
  onSubmit,
  primaryLabel = "Send for Review",
  secondaryLabel = "Save Draft",
  onSecondary,
  submitting,
}: {
  employee: Employee;
  onSubmit: (s: ProfileEditorState) => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  onSecondary?: (s: ProfileEditorState) => void;
  submitting?: boolean;
}) {
  const [state, setState] = useState<ProfileEditorState>(() => toEditorState(employee));
  useEffect(() => setState(toEditorState(employee)), [employee]);

  const explicit = state.skills.filter((s) => !s.is_inferred);
  const inferred = state.skills.filter((s) => s.is_inferred);

  function patch<K extends keyof ProfileEditorState>(k: K, v: ProfileEditorState[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function acceptInferred(name: string) {
    setState((s) => ({
      ...s,
      skills: s.skills.map((sk) =>
        sk.name === name && sk.is_inferred ? { ...sk, is_inferred: false } : sk,
      ),
    }));
  }
  function rejectInferred(name: string) {
    setState((s) => ({
      ...s,
      skills: s.skills.filter((sk) => !(sk.name === name && sk.is_inferred)),
    }));
  }

  function updateSkill(idx: number, patch: Partial<Skill>) {
    setState((s) => ({
      ...s,
      skills: s.skills.map((sk, i) => (i === idx ? { ...sk, ...patch } : sk)),
    }));
  }

  const grouped = useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const s of explicit) (map[s.category] ||= []).push(s);
    return map;
  }, [explicit]);

  const completeness = useMemo(
    () =>
      computeProfileCompleteness({
        headline: state.headline,
        location: state.location,
        years_experience: state.years_experience,
        bio: state.bio,
        skills: state.skills,
        projects: state.projects,
      }),
    [state.headline, state.location, state.years_experience, state.bio, state.skills, state.projects],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <Card>
        <CardContent className="p-4">
          <ProfileCompletenessMeter
            score={completeness.score}
            missing={completeness.missing}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar name={state.full_name || "?"} size={56} />
          <div className="flex-1 space-y-2">
            <Input
              className="!h-9 !text-lg font-semibold"
              value={state.full_name}
              onChange={(e) => patch("full_name", e.target.value)}
            />
            <Input
              className="!h-8"
              value={state.headline}
              onChange={(e) => patch("headline", e.target.value)}
              placeholder="Headline"
            />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs"><MapPin className="mr-1 inline h-3 w-3" />Location</Label>
            <Input value={state.location} onChange={(e) => patch("location", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs"><Briefcase className="mr-1 inline h-3 w-3" />Years experience</Label>
            <Input
              type="number"
              step="0.1"
              value={state.years_experience}
              onChange={(e) =>
                patch("years_experience", e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Allocation</Label>
            <Select
              value={state.allocation_status}
              onValueChange={(v) => patch("allocation_status", v as Employee["allocation_status"])}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UNALLOCATED">Unallocated</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="ALLOCATED">Allocated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 space-y-1.5">
            <Label className="text-xs">Bio</Label>
            <Textarea
              rows={2}
              value={state.bio}
              onChange={(e) => patch("bio", e.target.value)}
              placeholder="One sentence about you."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Skills</CardTitle>
          <Badge variant="muted">{explicit.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {CATEGORIES.map((cat) =>
            grouped[cat]?.length ? (
              <div key={cat}>
                <div className="mb-2 text-xs font-medium text-muted-foreground">{cat}</div>
                <div className="flex flex-wrap gap-2">
                  {grouped[cat].map((s) => {
                    const realIdx = state.skills.indexOf(s);
                    return (
                      <SkillEditPill
                        key={s.name + realIdx}
                        skill={s}
                        onChange={(patch) => updateSkill(realIdx, patch)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
        </CardContent>
      </Card>

      {inferred.length > 0 && (
        <Card className="border-amber-200 bg-inferred/30 dark:border-amber-900/40">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-base">Inferred Skills</CardTitle>
            <Badge variant="muted" className="ml-auto">{inferred.length}</Badge>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              The AI thinks you almost certainly know these too — hover a pill to see why.
              Tap ✓ to keep them, ✗ to drop them.
            </p>
            <div className="flex flex-wrap gap-2">
              {inferred.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-1 rounded-full bg-card px-1 py-0.5 ring-1 ring-amber-300/60 dark:ring-amber-700/60"
                >
                  <SkillPill skill={s} />
                  <button
                    type="button"
                    className="rounded-full p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    onClick={() => acceptInferred(s.name)}
                    aria-label={`Accept ${s.name}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                    onClick={() => rejectInferred(s.name)}
                    aria-label={`Reject ${s.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Projects</CardTitle>
          <Badge variant="muted">{state.projects.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.projects.map((p, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="mb-1 flex items-center justify-between">
                <h4 className="font-medium">{p.title}</h4>
                <span className="text-xs text-muted-foreground">
                  {p.start_date ?? "?"} – {p.end_date ?? "Present"}
                </span>
              </div>
              <div className="mb-2 text-xs text-muted-foreground">
                {p.role && <span>{p.role}</span>}
                {p.role && p.domain && <span> · </span>}
                {p.domain && <span>{p.domain}</span>}
              </div>
              {p.description && (
                <p className="mb-2 text-sm text-muted-foreground">{p.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(p.tech_stack ?? []).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {state.projects.length === 0 && (
            <p className="text-sm text-muted-foreground">No projects extracted.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => onSubmit(state)} disabled={submitting}>
          {primaryLabel}
        </Button>
        {onSecondary && (
          <Button variant="ghost" onClick={() => onSecondary(state)} disabled={submitting}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function SkillEditPill({ skill, onChange }: { skill: Skill; onChange: (p: Partial<Skill>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <SkillPill skill={skill} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div className="absolute z-10 mt-1 w-56 space-y-2 rounded-md border bg-popover p-3 shadow-md">
          <div>
            <Label className="text-[10px]">Proficiency</Label>
            <Select
              value={skill.proficiency}
              onValueChange={(v) => onChange({ proficiency: v as Skill["proficiency"] })}
            >
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NOVICE">Novice</SelectItem>
                <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                <SelectItem value="EXPERT">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Years</Label>
            <Input
              type="number"
              step="0.5"
              className="h-8"
              value={skill.years_experience ?? ""}
              onChange={(e) =>
                onChange({
                  years_experience: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
          <Button size="sm" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
