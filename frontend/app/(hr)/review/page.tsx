"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReviewQueue } from "@/hooks/use-review-queue";

export default function ReviewQueuePage() {
  const { data, isLoading } = useReviewQueue();

  return (
    <div className="container max-w-4xl py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review queue</h1>
          <p className="text-sm text-muted-foreground">
            Profiles waiting for HR approval before they appear in search.
          </p>
        </div>
        {data && <Badge variant="muted">{data.total} pending</Badge>}
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(data?.items ?? []).map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="font-medium">
                    {item.employee_name ?? "Unknown Employee"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.employee_headline && (
                      <span>{item.employee_headline} · </span>
                    )}
                    Submitted {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant="muted">{item.status}</Badge>
                <Button asChild size="sm">
                  <Link href={`/review/${item.id}`}>Review</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {(data?.items ?? []).length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/20 py-12 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                No items pending review right now.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href="/directory">View Directory</Link>
                </Button>
                <Button asChild>
                  <Link href="/bulk-upload">Bulk Upload</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
