"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  "Who can lead a React project that also needs WebSocket experience?",
  "Find me a backend dev in Pune with 3+ years of Java and payment gateway integration.",
  "Senior frontend folks who haven't been on a new project this quarter.",
  "Who has shipped a healthcare app with offline data sync?",
];

export function SearchInput({
  onSubmit,
  hero = true,
  busy,
}: {
  onSubmit: (query: string) => void;
  hero?: boolean;
  busy?: boolean;
}) {
  const [value, setValue] = useState("");
  const [idx, setIdx] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/mac/i.test(navigator.platform));
    }
  }, []);

  useEffect(() => {
    if (value) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, [value]);

  const kbdHint = isMac ? "⌘K" : "Ctrl K";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim().length >= 3) onSubmit(value.trim());
      }}
      className={cn("relative mx-auto w-full", hero ? "max-w-2xl" : "max-w-3xl")}
    >
      <Search
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground",
          hero ? "h-5 w-5" : "h-4 w-4",
        )}
      />
      <Input
        id="global-search-input"
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDERS[idx]}
        disabled={busy}
        className={cn(
          "pl-12 transition-all",
          hero ? "h-16 pr-44 text-lg shadow-lg ring-1 ring-border/60" : "h-12 pr-36",
        )}
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {!value && !busy && (
          <kbd
            className="pointer-events-none hidden rounded-md border bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block"
            aria-hidden
          >
            {kbdHint}
          </kbd>
        )}
        <Button
          type="submit"
          size={hero ? "lg" : "default"}
          disabled={busy || value.trim().length < 3}
        >
          Search
        </Button>
      </div>
    </form>
  );
}
