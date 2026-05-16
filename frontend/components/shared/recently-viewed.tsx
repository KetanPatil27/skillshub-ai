"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RecentlyViewed({ onSelect }: { onSelect: (id: string) => void }) {
  const [recent, setRecent] = useState<{ id: string; name: string; headline: string | null }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function load() {
      try {
        const data = JSON.parse(localStorage.getItem("recent_employees") || "[]");
        setRecent(data);
      } catch (e) {}
    }
    load();
    window.addEventListener("recent_employees_updated", load);
    return () => window.removeEventListener("recent_employees_updated", load);
  }, []);

  if (recent.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          Recently viewed
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recently viewed profiles</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4 max-h-[60vh] overflow-y-auto pr-2">
          {recent.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => {
                setOpen(false);
                onSelect(r.id);
              }}
            >
              <div>
                <div className="font-medium">{r.name}</div>
                {r.headline && <div className="text-xs text-muted-foreground">{r.headline}</div>}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
