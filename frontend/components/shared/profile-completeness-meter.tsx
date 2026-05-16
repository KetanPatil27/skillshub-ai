"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
  full: {
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  good: {
    bar: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-300",
  },
  partial: {
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
  },
} as const;

function tone(score: number) {
  if (score >= 90) return TONES.full;
  if (score >= 60) return TONES.good;
  return TONES.partial;
}

export function ProfileCompletenessMeter({
  score,
  missing = [],
  compact = false,
  className,
}: {
  score: number;
  missing?: string[];
  compact?: boolean;
  className?: string;
}) {
  const t = tone(score);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">
          Profile completeness
        </span>
        <span className={cn("font-semibold tabular-nums", t.text)}>
          {score}%
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("absolute inset-y-0 left-0 rounded-full", t.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
      {!compact && missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1 text-[11px] text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>Add</span>
          {missing.map((m, i) => (
            <span key={m} className="font-medium text-foreground/80">
              {m}
              {i < missing.length - 1 ? "," : ""}
            </span>
          ))}
          <span>to reach 100%.</span>
        </div>
      )}
      {!compact && missing.length === 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          Your profile is complete.
        </div>
      )}
    </div>
  );
}
