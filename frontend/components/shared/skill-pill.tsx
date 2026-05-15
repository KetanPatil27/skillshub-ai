"use client";

import { Sparkles } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Skill } from "@/types";
import { cn, proficiencyTone } from "@/lib/utils";

export function SkillPill({
  skill,
  highlighted,
  onClick,
}: {
  skill: Skill;
  highlighted?: boolean;
  onClick?: () => void;
}) {
  const tone = proficiencyTone(skill.proficiency);
  const yrs =
    skill.years_experience !== null && skill.years_experience !== undefined
      ? `${Number(skill.years_experience)}y`
      : null;

  const base = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        tone,
        skill.is_inferred && "bg-inferred text-inferred-foreground ring-1 ring-inferred-foreground/30",
        highlighted && "ring-2 ring-primary ring-offset-1 ring-offset-background",
      )}
    >
      {skill.is_inferred && <Sparkles className="h-3 w-3" />}
      <span>{skill.name}</span>
      {yrs && <span className="text-[10px] opacity-70">{yrs}</span>}
    </button>
  );

  if (skill.is_inferred && skill.inference_reason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{base}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="text-[11px] font-semibold">
              Inferred · {Math.round((skill.inference_confidence ?? 0) * 100)}% confidence
            </div>
            <div className="text-[11px] leading-snug">{skill.inference_reason}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
  return base;
}
