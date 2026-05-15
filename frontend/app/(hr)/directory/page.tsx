"use client";

import { useState } from "react";

import { EmployeeSheet } from "@/components/shared/employee-sheet";
import { Avatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployees, type EmployeeFilters } from "@/hooks/use-employees";
import { allocationTone, cn } from "@/lib/utils";

export default function DirectoryPage() {
  const [filters, setFilters] = useState<EmployeeFilters>({ page: 1, page_size: 12 });
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useEmployees(filters);

  function patch(p: Partial<EmployeeFilters>) {
    setFilters((f) => ({ ...f, ...p, page: 1 }));
  }

  return (
    <div className="container max-w-6xl py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Directory</h1>
        <p className="text-sm text-muted-foreground">All employee profiles in SkillsHub.</p>
      </header>

      <Card className="mb-6">
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
          <Input
            placeholder="Search name or headline…"
            value={filters.q ?? ""}
            onChange={(e) => patch({ q: e.target.value || undefined })}
          />
          <Input
            placeholder="Location (e.g. Pune)"
            value={filters.location ?? ""}
            onChange={(e) => patch({ location: e.target.value || undefined })}
          />
          <Select
            value={filters.allocation_status ?? "ALL"}
            onValueChange={(v) =>
              patch({ allocation_status: v === "ALL" ? undefined : v })
            }
          >
            <SelectTrigger><SelectValue placeholder="Allocation" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All allocations</SelectItem>
              <SelectItem value="UNALLOCATED">Available</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="ALLOCATED">Allocated</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Min years"
            value={filters.min_years ?? ""}
            onChange={(e) =>
              patch({
                min_years: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.items ?? []).map((e) => {
              const tone = allocationTone(e.allocation_status);
              return (
                <Card
                  key={e.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => setOpenId(e.id)}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={e.full_name} size={42} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-semibold">{e.full_name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {e.headline} {e.location && `· ${e.location}`}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]",
                          tone.text,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
                        {tone.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {e.top_skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {data && data.total > data.page_size && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.page} of {Math.max(1, Math.ceil(data.total / data.page_size))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page * data.page_size >= data.total}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <EmployeeSheet
        employeeId={openId}
        open={openId !== null}
        onOpenChange={(v) => !v && setOpenId(null)}
      />
    </div>
  );
}
