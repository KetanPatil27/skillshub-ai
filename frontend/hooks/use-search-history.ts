"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { RecentSearchItem, SavedSearch } from "@/types";

export function useRecentSearches() {
  return useQuery<RecentSearchItem[]>({
    queryKey: ["search-history"],
    queryFn: async () => {
      const { data } = await api.get<RecentSearchItem[]>("/search/history");
      return data;
    },
    staleTime: 30_000,
  });
}

export function useSavedSearches() {
  return useQuery<SavedSearch[]>({
    queryKey: ["search-saved"],
    queryFn: async () => {
      const { data } = await api.get<SavedSearch[]>("/search/saved");
      return data;
    },
    staleTime: 30_000,
  });
}

export function useSaveSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { query_text: string; label?: string | null }) => {
      const { data } = await api.post<SavedSearch>("/search/saved", body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["search-saved"] });
    },
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/search/saved/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["search-saved"] });
    },
  });
}
