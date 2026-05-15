"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";

import { cn, scoreColor } from "@/lib/utils";

export function ScoreBadge({ score, size = 72 }: { score: number; size?: number }) {
  const { ring, text } = scoreColor(score);
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(100, score));

  const [displayed, setDisplayed] = useState(0);
  const controls = useAnimation();

  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setDisplayed(Math.round(target * (0.5 - Math.cos(p * Math.PI) / 2)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    controls.start({ strokeDashoffset: c - (c * target) / 100, transition: { duration: 0.9, ease: "easeOut" } });
    return () => cancelAnimationFrame(raf);
  }, [target, c, controls]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          className="text-muted/40"
          strokeWidth={4}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={4}
          fill="transparent"
          strokeLinecap="round"
          className={cn(ring)}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={controls}
        />
      </svg>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center text-lg font-bold tabular-nums",
          text,
        )}
      >
        {displayed}
      </div>
    </div>
  );
}
