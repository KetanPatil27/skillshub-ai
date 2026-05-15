"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

import { Avatar } from "@/components/shared/avatar";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
              <Tooltip>
                <TooltipTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                  >
                    <Quote className="h-3 w-3" /> Why this match?
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Evidence
                  </div>
                  {result.evidence_snippets.map((s, i) => (
                    <p key={i} className="text-[12px] italic leading-snug">
                      &ldquo;…{s}…&rdquo;
                    </p>
                  ))}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex-shrink-0">
            <ScoreBadge score={result.match_score} size={72} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
