"use client";

import { useCallback, useRef, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { SearchResult, TeamBuildResult } from "@/types";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Phase = "idle" | "streaming" | "done" | "error";

/**
 * SSE search hook. EventSource doesn't support POST + Auth headers, so we use
 * `fetch` + ReadableStream and parse the `data:` lines ourselves.
 *
 * Handles three event types:
 *   - `event: query`  — JD distillation step, payload { generated_query }
 *   - `event: result` — one ranked candidate
 *   - `event: error`  — stream-level failure
 */
export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [generatedQuery, setGeneratedQuery] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setResults([]);
    setGeneratedQuery(null);
    setPhase("idle");
    setError(null);
  }, []);

  const runStream = useCallback(
    async (path: string, body: object) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setResults([]);
      setGeneratedQuery(null);
      setError(null);
      setPhase("streaming");

      const token = getToken();
      try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Search failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sepIndex: number;
          while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, sepIndex);
            buffer = buffer.slice(sepIndex + 2);
            processFrame(frame);
          }
        }
        setPhase((p) => (p === "error" ? p : "done"));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Search failed");
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
        try {
          const parsed = JSON.parse(data);
          if (event === "query") {
            if (typeof parsed.generated_query === "string") {
              setGeneratedQuery(parsed.generated_query);
            }
          } else if (event === "result") {
            setResults((cur) => [...cur, parsed as SearchResult]);
          } else if (event === "error") {
            setError(parsed.message || "Search failed mid-stream");
            setPhase("error");
          }
        } catch {
          // Ignore non-JSON keep-alives.
        }
      }
    },
    [],
  );

  const run = useCallback(
    (query: string, limit = 5) => runStream("/search", { query, limit }),
    [runStream],
  );

  const runFromJD = useCallback(
    (jobDescription: string, limit = 5) =>
      runStream("/search/jd", { job_description: jobDescription, limit }),
    [runStream],
  );

  return { results, generatedQuery, phase, error, run, runFromJD, reset };
}

export function useTeamBuilder() {
  return useMutation({
    mutationFn: async (body: { brief: string; team_size: number }) => {
      const { data } = await api.post<TeamBuildResult>("/search/team", body);
      return data;
    },
  });
}
