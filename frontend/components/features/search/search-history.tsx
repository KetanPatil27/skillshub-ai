"use client";

import { Clock, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useDeleteSavedSearch,
  useRecentSearches,
  useSavedSearches,
} from "@/hooks/use-search-history";
import { errorMessage } from "@/lib/api";

export function SearchHistory({ onPick }: { onPick: (q: string) => void }) {
  const recent = useRecentSearches();
  const saved = useSavedSearches();
  const del = useDeleteSavedSearch();

  const hasSaved = !!saved.data && saved.data.length > 0;
  const hasRecent = !!recent.data && recent.data.length > 0;

  if (!hasSaved && !hasRecent) return null;

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-4">
      {hasSaved && (
        <section>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Star className="h-3 w-3" /> Saved
          </div>
          <div className="flex flex-wrap gap-1.5">
            {saved.data!.map((s) => (
              <div
                key={s.id}
                className="group flex items-center gap-0.5 rounded-full border border-amber-300/60 bg-amber-50/70 pl-2.5 pr-0.5 text-xs dark:border-amber-800/60 dark:bg-amber-950/30"
              >
                <button
                  type="button"
                  onClick={() => onPick(s.query_text)}
                  className="max-w-[260px] truncate py-1 text-left text-amber-900 dark:text-amber-200"
                  title={s.query_text}
                >
                  {s.label || s.query_text}
                </button>
                <button
                  type="button"
                  className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted/60 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={async () => {
                    try {
                      await del.mutateAsync(s.id);
                      toast.success("Removed from saved.");
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                  }}
                  aria-label="Remove saved search"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasRecent && (
        <section>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3 w-3" /> Recent
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recent.data!.slice(0, 6).map((r) => (
              <button
                key={r.query_text}
                type="button"
                onClick={() => onPick(r.query_text)}
                className="max-w-[280px] truncate rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground transition-colors hover:bg-secondary/80"
                title={r.query_text}
              >
                {r.query_text}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
