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
 */
export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setResults([]);
    setPhase("idle");
    setError(null);
  }, []);

  const run = useCallback(async (query: string, limit = 5) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setResults([]);
    setError(null);
    setPhase("streaming");

    const token = getToken();
    try {
      const res = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ query, limit }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Search failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // SSE frames: separated by blank lines. Each frame may have an `event:` and `data:` line.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sepIndex: number;
        // eslint-disable-next-line no-cond-assign
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
      let dataLines: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      const data = dataLines.join("\n");
      if (!data) return;
      try {
        const parsed = JSON.parse(data);
        if (event === "result") {
          setResults((cur) => [...cur, parsed as SearchResult]);
        } else if (event === "error") {
          setError(parsed.message || "Search failed mid-stream");
          setPhase("error");
        }
      } catch {
        // Ignore non-JSON keep-alives.
      }
    }
  }, []);

  return { results, phase, error, run, reset };
}

export function useTeamBuilder() {
  return useMutation({
    mutationFn: async (body: { brief: string; team_size: number }) => {
      const { data } = await api.post<TeamBuildResult>("/search/team", body);
      return data;
    },
  });
}
