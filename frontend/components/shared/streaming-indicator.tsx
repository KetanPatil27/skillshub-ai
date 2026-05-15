"use client";

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function StreamingIndicator({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary",
        className,
      )}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span className="bg-gradient-to-r from-primary via-primary/40 to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
        {message}
      </span>
    </div>
  );
}
