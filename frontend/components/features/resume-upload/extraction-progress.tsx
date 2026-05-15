"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const STEPS = [
  { key: "upload", label: "Uploading resume…", ms: 700 },
  { key: "read", label: "Reading PDF…", ms: 600 },
  { key: "extract", label: "Extracting skills with Gemini…", ms: 2000 },
  { key: "infer", label: "Inferring related skills…", ms: 1200 },
] as const;

/**
 * Simulated multi-step progress that race-skips remaining steps when `complete`
 * flips true (i.e. when the real API returns faster than the timeline).
 */
export function ExtractionProgress({ complete }: { complete: boolean }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (complete) {
      setIdx(STEPS.length);
      return;
    }
    if (idx >= STEPS.length) return;
    const t = setTimeout(() => setIdx((i) => Math.min(i + 1, STEPS.length)), STEPS[idx].ms);
    return () => clearTimeout(t);
  }, [idx, complete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-md space-y-3 rounded-2xl border bg-card p-6 shadow-sm"
    >
      <h3 className="text-base font-semibold">Reading your resume</h3>
      <ul className="space-y-2">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx && !complete;
          return (
            <li
              key={s.key}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
                active && "bg-primary/5",
              )}
            >
              <div className="flex h-6 w-6 items-center justify-center">
                <AnimatePresence mode="wait" initial={false}>
                  {done ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </motion.span>
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-muted" />
                  )}
                </AnimatePresence>
              </div>
              <span
                className={cn(
                  "text-sm",
                  done && "text-foreground",
                  active && "font-medium text-foreground",
                  !done && !active && "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
