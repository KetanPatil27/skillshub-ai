"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AnalyticsOverview } from "@/types";

export function useAnalyticsOverview() {
  return useQuery<AnalyticsOverview>({
    queryKey: ["analytics-overview"],
    queryFn: async () => {
      const { data } = await api.get<AnalyticsOverview>("/analytics/overview");
      return data;
    },
    staleTime: 60_000,
  });
}
