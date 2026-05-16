"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { API_BASE_URL, api } from "@/lib/api";
import { getToken } from "@/lib/auth";
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

export type BulkFileStatus = "pending" | "processing" | "success" | "error";

export interface BulkFileResult {
  index: number;
  filename: string;
  status: BulkFileStatus;
  employeeId?: string;
  extractedName?: string;
  skillsCount?: number;
  projectsCount?: number;
  inferredCount?: number;
  error?: string;
}

type BulkPhase = "idle" | "uploading" | "done" | "error";

export function useBulkResumeUpload() {
  const [files, setFiles] = useState<BulkFileResult[]>([]);
  const [phase, setPhase] = useState<BulkPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setFiles([]);
    setPhase("idle");
    setError(null);
  }, []);

  const start = useCallback(async (input: File[]) => {
    if (input.length === 0) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setFiles(
      input.map((f, idx) => ({
        index: idx,
        filename: f.name,
        status: "pending" as BulkFileStatus,
      })),
    );
    setError(null);
    setPhase("uploading");

    const fd = new FormData();
    input.forEach((f) => fd.append("files", f, f.name));

    const token = getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/resumes/bulk`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: fd,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Bulk upload failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          processFrame(frame);
        }
      }
      setPhase((p) => (p === "error" ? p : "done"));
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Bulk upload failed");
      setPhase("error");
    }

    function processFrame(frame: string) {
      let event = "message";
      const dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      const data = dataLines.join("\n");
      if (!data) return;
      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }

      setFiles((cur) => {
        if (event === "file_start") {
          return cur.map((f) =>
            f.index === parsed.index ? { ...f, status: "processing" } : f,
          );
        }
        if (event === "file_done") {
          return cur.map((f) =>
            f.index === parsed.index
              ? {
                  ...f,
                  status: "success",
                  employeeId: parsed.employee_id,
                  extractedName: parsed.extracted_name,
                  skillsCount: parsed.skills_count,
                  projectsCount: parsed.projects_count,
                  inferredCount: parsed.inferred_count,
                }
              : f,
          );
        }
        if (event === "file_error") {
          return cur.map((f) =>
            f.index === parsed.index
              ? { ...f, status: "error", error: parsed.message }
              : f,
          );
        }
        return cur;
      });
    }
  }, []);

  return { files, phase, error, start, reset };
}
