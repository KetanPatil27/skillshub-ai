"use client";

import { cn } from "@/lib/utils";
import { scorePassword } from "@/lib/validations";

const LABELS = ["Too weak", "Too weak", "Okay", "Strong"] as const;
const COLORS = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-emerald-500"];
const WIDTHS = ["w-0", "w-1/3", "w-2/3", "w-full"];

export function PasswordStrengthIndicator({ value }: { value: string }) {
  const score = scorePassword(value);
  // Hide entirely when the field is empty.
  if (!value) return null;
  return (
    <div className="space-y-1">
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            COLORS[score],
            WIDTHS[score],
          )}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{LABELS[score]}</span>
        <span>
          8+ chars · letter · number
        </span>
      </div>
    </div>
  );
}
