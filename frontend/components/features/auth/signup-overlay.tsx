"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function SignupOverlay({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="flex max-w-sm flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center shadow-lg"
      >
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && (
            <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
