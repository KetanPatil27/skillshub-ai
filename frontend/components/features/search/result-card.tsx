"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lightbulb, Quote, ShieldCheck } from "lucide-react";

import { Avatar } from "@/components/shared/avatar";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Card, CardContent } from "@/components/ui/card";
import { allocationTone, cn } from "@/lib/utils";
import type { SearchResult } from "@/types";

export function ResultCard({
  result,
  index,
  onOpen,
}: {
  result: SearchResult;
  index: number;
  onOpen?: (id: string) => void;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const tone = allocationTone(result.allocation_status ?? "ALLOCATED");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.32 }}
    >
      <Card
        className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
        onClick={() => onOpen?.(result.employee_id)}
      >
        <CardContent className="flex gap-4 p-5">
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <Avatar name={result.name} size={42} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold">{result.name}</h3>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium",
                      tone.text,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
                    {tone.label}
                  </span>
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground truncate">
                  {result.headline}
                  {result.location && <span> · {result.location}</span>}
                </div>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{result.reason}</p>

            <div className="flex flex-wrap gap-1.5">
              {result.matched_skill_names.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {s}
                </span>
              ))}
            </div>

            {result.evidence_snippets.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEvidence((v) => !v);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Why this match?
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    showEvidence && "rotate-180",
                  )}
                />
              </button>
            )}
          </div>

          <div className="flex-shrink-0">
            <ScoreBadge score={result.match_score} size={72} />
          </div>
        </CardContent>

        {/* ── Evidence Card ────────────────────────── */}
        <AnimatePresence>
          {showEvidence && result.evidence_snippets.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-t bg-muted/40 px-5 py-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Evidence & Match Reasoning
                </div>

                {/* Match reason */}
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-sm font-medium text-foreground mb-1">Match Reason</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {result.reason}
                  </p>
                </div>

                {/* Evidence snippets */}
                <div className="space-y-2">
                  {result.evidence_snippets.map((snippet, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex gap-2"
                    >
                      <Quote className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                      <p className="text-sm leading-relaxed text-foreground/80 italic">
                        &ldquo;{snippet}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>

                {/* Matched skills */}
                {result.matched_skill_names.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Matched Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.matched_skill_names.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

