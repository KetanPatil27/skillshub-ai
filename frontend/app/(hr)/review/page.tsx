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
                    Review item{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      #{item.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
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
            <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No items pending review.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
