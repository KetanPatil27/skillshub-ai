"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsOverview } from "@/hooks/use-analytics";
import { allocationTone, cn } from "@/lib/utils";
import type { AnalyticsOverview, SkillStat } from "@/types";

const CATEGORY_TONE: Record<string, string> = {
  LANGUAGE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  FRAMEWORK: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  PLATFORM: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  TOOL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  DOMAIN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalyticsOverview();

  if (isLoading || !data) {
    return (
      <div className="container max-w-6xl space-y-6 py-8">
        <header className="mb-2">
          <h1 className="text-2xl font-semibold">Skills analytics</h1>
          <p className="text-sm text-muted-foreground">
            Population-level insight across approved profiles.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const hasData = data.total_approved > 0;

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Skills analytics</h1>
          <p className="text-sm text-muted-foreground">
            Population-level insight across approved profiles.
          </p>
        </div>
        {data.total_pending > 0 && (
          <Badge variant="muted">{data.total_pending} pending review</Badge>
        )}
      </header>

      {!hasData ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No approved profiles yet. Once HR approves a profile in the review
            queue, it will show up here.
          </CardContent>
        </Card>
      ) : (
        <>
          <StatTiles data={data} />

          {data.hiring_recommendations.length > 0 && (
            <Recommendations items={data.hiring_recommendations} />
          )}

          <TopSkillsCard skills={data.top_skills} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ScarceSkillsCard skills={data.scarce_skills} />
            <LocationsCard data={data} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <AllocationCard data={data} />
            <CategoryCard data={data} />
          </div>
        </>
      )}
    </div>
  );
}

function StatTiles({ data }: { data: AnalyticsOverview }) {
  const tiles: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: "Approved profiles",
      value: String(data.total_approved),
      icon: <Users className="h-4 w-4 text-primary" />,
    },
    {
      label: "Distinct skills tracked",
      value: String(data.total_skills_tracked),
      icon: <TrendingUp className="h-4 w-4 text-primary" />,
    },
    {
      label: "Inferred by AI",
      value: `${Math.round(data.inferred_ratio * 100)}%`,
      icon: <Sparkles className="h-4 w-4 text-primary" />,
    },
    {
      label: "Pending review",
      value: String(data.total_pending),
      icon: <AlertTriangle className="h-4 w-4 text-primary" />,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {t.icon}
                {t.label}
              </div>
              <div className="text-2xl font-semibold tabular-nums">{t.value}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function Recommendations({ items }: { items: string[] }) {
  return (
    <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/10">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <CardTitle className="text-base">Hiring recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {items.map((r, i) => (
            <li key={i} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TopSkillsCard({ skills }: { skills: SkillStat[] }) {
  const max = skills[0]?.count ?? 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top skills</CardTitle>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills tracked yet.</p>
        ) : (
          <div className="space-y-2.5">
            {skills.map((s) => (
              <SkillBar key={s.name} skill={s} max={max} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillBar({ skill, max }: { skill: SkillStat; max: number }) {
  const widthPct = Math.max(4, Math.round((skill.count / max) * 100));
  const expertPct =
    skill.count > 0 ? Math.round((skill.expert_count / skill.count) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium">{skill.name}</span>
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              CATEGORY_TONE[skill.category] ?? "bg-muted text-muted-foreground",
            )}
          >
            {skill.category}
          </span>
        </div>
        <span className="tabular-nums text-muted-foreground">
          {skill.count}{" "}
          {skill.expert_count > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              · {skill.expert_count} expert
              {skill.expert_count === 1 ? "" : "s"}
            </span>
          )}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary/30"
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${(widthPct * expertPct) / 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
        />
      </div>
    </div>
  );
}

function ScarceSkillsCard({ skills }: { skills: SkillStat[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skills without an expert</CardTitle>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Every skill in the org has at least one expert. Healthy coverage.
          </p>
        ) : (
          <ul className="space-y-2">
            {skills.map((s) => (
              <li
                key={s.name}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      CATEGORY_TONE[s.category] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {s.category}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {s.count} {s.count === 1 ? "user" : "users"} · 0 experts
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LocationsCard({ data }: { data: AnalyticsOverview }) {
  const max = data.location_breakdown[0]?.count ?? 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Where engineers are</CardTitle>
      </CardHeader>
      <CardContent>
        {data.location_breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No locations on file.</p>
        ) : (
          <div className="space-y-2.5">
            {data.location_breakdown.map((l) => {
              const pct = Math.max(4, Math.round((l.count / max) * 100));
              return (
                <div key={l.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {l.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {l.count}
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AllocationCard({ data }: { data: AnalyticsOverview }) {
  const order = ["UNALLOCATED", "PARTIAL", "ALLOCATED"] as const;
  const total = order.reduce(
    (sum, k) => sum + (data.allocation_breakdown[k] ?? 0),
    0,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Allocation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {order.map((k) => {
            const count = data.allocation_breakdown[k] ?? 0;
            if (count === 0 || total === 0) return null;
            const pct = (count / total) * 100;
            const tone = allocationTone(k);
            return (
              <div
                key={k}
                className={cn("h-full", tone.dot)}
                style={{ width: `${pct}%` }}
                title={`${tone.label}: ${count}`}
              />
            );
          })}
        </div>
        <div className="space-y-1.5">
          {order.map((k) => {
            const count = data.allocation_breakdown[k] ?? 0;
            const tone = allocationTone(k);
            const pct = total === 0 ? 0 : Math.round((count / total) * 100);
            return (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", tone.dot)} />
                  <span className={tone.text}>{tone.label}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {count} · {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryCard({ data }: { data: AnalyticsOverview }) {
  const entries = Object.entries(data.category_breakdown);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skill mix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No skills tracked yet.</p>
        ) : (
          entries.map(([cat, count]) => {
            const pct = total === 0 ? 0 : Math.round((count / total) * 100);
            return (
              <div key={cat}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 font-medium",
                      CATEGORY_TONE[cat] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {cat}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
