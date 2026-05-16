"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Search as SearchIcon, Sparkles, Star, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmployeeSheet } from "@/components/shared/employee-sheet";
import { StreamingIndicator } from "@/components/shared/streaming-indicator";
import { Avatar } from "@/components/shared/avatar";
import { ResultCard } from "@/components/features/search/result-card";
import { SearchHistory } from "@/components/features/search/search-history";
import { SearchInput } from "@/components/features/search/search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useEmployees } from "@/hooks/use-employees";
import { useSearch, useTeamBuilder } from "@/hooks/use-search";
import { useSaveSearch, useSavedSearches } from "@/hooks/use-search-history";
import { errorMessage } from "@/lib/api";

export default function SearchPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const search = useSearch();
  const saveSearch = useSaveSearch();
  const savedSearches = useSavedSearches();
  const totalProfilesQ = useEmployees({ status: "APPROVED", page_size: 1 });
  const totalProfiles = totalProfilesQ.data?.total ?? 0;

  function runSearch(q: string) {
    setLastQuery(q);
    search.run(q, 5);
  }

  function clearSearch() {
    search.reset();
    setLastQuery(null);
  }

  async function saveCurrentSearch() {
    if (!lastQuery) return;
    try {
      await saveSearch.mutateAsync({ query_text: lastQuery, label: null });
      toast.success("Saved to your searches.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const alreadySaved =
    !!lastQuery &&
    !!savedSearches.data?.some((s) => s.query_text === lastQuery);

  return (
    <div className="container max-w-5xl py-8">
      <Tabs defaultValue="search">
        <div className="mb-6 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="search" className="gap-2">
              <SearchIcon className="h-4 w-4" /> Search
            </TabsTrigger>
            <TabsTrigger value="jd" className="gap-2">
              <FileText className="h-4 w-4" /> From JD
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" /> Build Team
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="search">
          <AnimatePresence mode="wait">
            {search.phase === "idle" && search.results.length === 0 ? (
              <motion.section
                key="hero"
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center pt-16"
              >
                <h1 className="mb-2 text-3xl font-semibold tracking-tight">
                  Ask SkillsHub anything.
                </h1>
                <p className="mb-8 max-w-xl text-center text-muted-foreground">
                  Type a real question. We&apos;ll search {totalProfiles} approved profiles and
                  rank them with a short reason for each.
                </p>
                <SearchInput
                  hero
                  onSubmit={runSearch}
                  busy={false}
                />
                <SearchHistory onPick={runSearch} />
              </motion.section>
            ) : (
              <motion.section
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <SearchInput
                  onSubmit={runSearch}
                  busy={search.phase === "streaming"}
                />

                <div className="flex items-center gap-3">
                  {search.phase === "streaming" && (
                    <StreamingIndicator
                      message={`Searching ${totalProfiles} profiles…`}
                    />
                  )}
                  {search.phase === "done" && (
                    <span className="text-sm text-muted-foreground">
                      {search.results.length} ranked result
                      {search.results.length === 1 ? "" : "s"}.
                    </span>
                  )}
                  {search.phase === "error" && search.error && (
                    <span className="text-sm text-destructive">{search.error}</span>
                  )}
                  {(search.results.length > 0 || search.phase !== "idle") && (
                    <div className="ml-auto flex items-center gap-1">
                      {lastQuery && search.phase !== "streaming" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={saveCurrentSearch}
                          disabled={alreadySaved || saveSearch.isPending}
                          aria-label={alreadySaved ? "Already saved" : "Save this search"}
                        >
                          <Star
                            className={
                              "mr-1.5 h-3.5 w-3.5 " +
                              (alreadySaved
                                ? "fill-amber-400 text-amber-500"
                                : "")
                            }
                          />
                          {alreadySaved ? "Saved" : "Save search"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (search.results.length === 0) return;
                          const header = "Name,Headline,Location,Match Score,Reason\n";
                          const rows = search.results.map(r => {
                            return `"${r.name}","${r.headline ?? ""}","${r.location ?? ""}",${Math.round(r.match_score * 100)}%,"${r.reason.replace(/"/g, '""')}"`;
                          }).join("\n");
                          const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `search-results.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Export CSV
                      </Button>
                      <Button variant="ghost" size="sm" onClick={clearSearch}>
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {search.results.map((r, i) => (
                    <ResultCard
                      key={r.employee_id + i}
                      result={r}
                      index={i}
                      onOpen={(id) => setOpenId(id)}
                    />
                  ))}
                  {search.phase === "done" && search.results.length === 0 && (
                    <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      No candidates matched. Try a broader query.
                    </p>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="jd">
          <JDSearchTab onOpen={setOpenId} totalProfiles={totalProfiles} />
        </TabsContent>

        <TabsContent value="team">
          <TeamBuilderTab onOpen={setOpenId} />
        </TabsContent>
      </Tabs>

      <EmployeeSheet
        employeeId={openId}
        open={openId !== null}
        onOpenChange={(v) => !v && setOpenId(null)}
      />
    </div>
  );
}

function JDSearchTab({
  onOpen,
  totalProfiles,
}: {
  onOpen: (id: string) => void;
  totalProfiles: number;
}) {
  const [jd, setJd] = useState("");
  const jdSearch = useSearch();

  function run() {
    const text = jd.trim();
    if (text.length < 30) {
      toast.message("Paste at least a paragraph of the job description.");
      return;
    }
    jdSearch.runFromJD(text, 5);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Paste a job description</label>
            <span className="text-xs text-muted-foreground">
              {jd.length} chars
            </span>
          </div>
          <Textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder={`Paste the full JD here.\n\ne.g. "Senior Backend Engineer — Pune. 5+ years Java/Spring Boot, must have payment gateway integration (Razorpay/Stripe), PostgreSQL, Kafka. Fintech background a plus."`}
            rows={8}
            className="font-mono text-xs"
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              We&apos;ll distill it into a query and rank {totalProfiles} approved
              profiles.
            </span>
            <Button
              onClick={run}
              disabled={
                jdSearch.phase === "streaming" || jd.trim().length < 30
              }
              className="ml-auto"
            >
              {jdSearch.phase === "streaming" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Find shortlist
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {jdSearch.generatedQuery && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Distilled query
              </div>
              <p className="mt-0.5 break-words font-mono text-xs leading-relaxed">
                {jdSearch.generatedQuery}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        {jdSearch.phase === "streaming" && (
          <StreamingIndicator
            message={
              jdSearch.generatedQuery
                ? "Ranking candidates…"
                : "Reading the JD…"
            }
          />
        )}
        {jdSearch.phase === "done" && (
          <span className="text-sm text-muted-foreground">
            {jdSearch.results.length} ranked result
            {jdSearch.results.length === 1 ? "" : "s"}.
          </span>
        )}
        {jdSearch.phase === "error" && jdSearch.error && (
          <span className="text-sm text-destructive">{jdSearch.error}</span>
        )}
        {(jdSearch.results.length > 0 ||
          jdSearch.generatedQuery ||
          jdSearch.phase === "error") && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={jdSearch.reset}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {jdSearch.results.map((r, i) => (
          <ResultCard
            key={r.employee_id + i}
            result={r}
            index={i}
            onOpen={(id) => onOpen(id)}
          />
        ))}
        {jdSearch.phase === "done" && jdSearch.results.length === 0 && (
          <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            No candidates matched. Try a JD with more concrete requirements.
          </p>
        )}
      </div>
    </div>
  );
}

function TeamBuilderTab({ onOpen }: { onOpen: (id: string) => void }) {
  const [brief, setBrief] = useState("");
  const [size, setSize] = useState(4);
  const team = useTeamBuilder();

  async function run() {
    if (brief.trim().length < 5) return;
    try {
      await team.mutateAsync({ brief: brief.trim(), team_size: size });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-5">
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="e.g. 4-person team for a 3-month healthcare app, needs mobile + backend + DevOps."
            rows={3}
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Team size</label>
            <input
              type="number"
              min={2}
              max={8}
              value={size}
              onChange={(e) => setSize(Math.max(2, Math.min(8, Number(e.target.value))))}
              className="h-9 w-16 rounded-md border bg-background px-2 text-sm"
            />
            <Button onClick={run} disabled={team.isPending || brief.trim().length < 5} className="ml-auto">
              {team.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Build Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {team.data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-2 text-sm font-semibold">Why this team</h3>
              <p className="text-sm text-muted-foreground">{team.data.rationale}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {team.data.team.map((m, i) => (
              <motion.div
                key={m.employee_id + i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => onOpen(m.employee_id)}
                >
                  <CardContent className="flex gap-3 p-4">
                    <Avatar name={m.name} size={40} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{m.name}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {m.role_on_team}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{m.why_picked}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {team.data.alternates.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="mb-2 text-sm font-semibold">Alternates</h3>
                <div className="space-y-2">
                  {team.data.alternates.map((a) => {
                    const replacedMember = team.data!.team.find(
                      (m) => m.employee_id === a.would_replace
                    );
                    const replaceName = replacedMember?.name ?? a.would_replace;
                    return (
                      <div
                        key={a.employee_id}
                        className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => onOpen(a.employee_id)}
                      >
                        <Avatar name={a.name} size={32} />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-foreground">{a.name}</span>
                          <p className="text-xs text-muted-foreground">
                            Could replace{" "}
                            <span className="font-medium text-foreground">{replaceName}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}
