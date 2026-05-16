"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function StreamingIndicator({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  const defaultStages = [
    "Analyzing query...",
    "Scanning skills directory...",
    "Ranking candidates...",
    "Extracting match evidence...",
    "Finalizing results..."
  ];
  
  const [stage, setStage] = useState(message);
  
  useEffect(() => {
    if (message.includes("Searching")) {
      let i = 0;
      setStage(defaultStages[i]);
      const int = setInterval(() => {
        i = (i + 1) % defaultStages.length;
        setStage(defaultStages[i]);
      }, 1500);
      return () => clearInterval(int);
    } else {
      setStage(message);
    }
  }, [message]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary",
        className,
      )}
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span className="bg-gradient-to-r from-primary via-primary/40 to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
        {stage}
      </span>
    </div>
  );
}
