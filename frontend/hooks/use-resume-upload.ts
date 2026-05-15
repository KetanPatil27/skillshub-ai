"use client";

import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ResumeUploadResponse } from "@/types";

export function useResumeUpload() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<ResumeUploadResponse>(
        "/resumes/upload",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
  });
}
