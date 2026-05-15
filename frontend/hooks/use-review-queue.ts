"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ReviewQueueItem, ReviewQueueItemWithEmployee } from "@/types";

export function useReviewQueue() {
  return useQuery<{ items: ReviewQueueItem[]; total: number }>({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const { data } = await api.get("/review/queue");
      return data;
    },
  });
}

export function useReviewItem(id: string | undefined) {
  return useQuery<ReviewQueueItemWithEmployee>({
    queryKey: ["review-item", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/review/${id}`);
      return data;
    },
  });
}

export function useApproveReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notes?: string) => {
      const { data } = await api.post(`/review/${id}/approve`, { notes });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-queue"] });
      qc.invalidateQueries({ queryKey: ["review-item", id] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useRejectReview(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notes?: string) => {
      const { data } = await api.post(`/review/${id}/reject`, { notes });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["review-queue"] });
      qc.invalidateQueries({ queryKey: ["review-item", id] });
    },
  });
}
