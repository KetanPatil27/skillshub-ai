"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  FileText,
  Inbox,
  Loader2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useBulkResumeUpload,
  type BulkFileResult,
  type BulkFileStatus,
} from "@/hooks/use-resume-upload";
import { cn } from "@/lib/utils";

const MAX_FILES = 20;
const MAX_SIZE = 5 * 1024 * 1024;

export default function BulkUploadPage() {
  const [pending, setPending] = useState<File[]>([]);
  const bulk = useBulkResumeUpload();

  const onDrop = useCallback((accepted: File[]) => {
    const valid = accepted.filter(
      (f) => f.type === "application/pdf" && f.size <= MAX_SIZE,
    );
    const rejected = accepted.length - valid.length;
    if (rejected > 0) {
      toast.message(`${rejected} file(s) skipped — must be PDF and ≤5MB.`);
    }
    setPending((cur) => {
      const merged = [...cur, ...valid];
      if (merged.length > MAX_FILES) {
        toast.message(`Max ${MAX_FILES} files; extras dropped.`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    maxSize: MAX_SIZE,
  });

  function removePending(idx: number) {
    setPending((cur) => cur.filter((_, i) => i !== idx));
  }

  async function startProcessing() {
    if (pending.length === 0) return;
    await bulk.start(pending);
  }

  function startOver() {
    setPending([]);
    bulk.reset();
  }

  const idle = bulk.phase === "idle";
  const uploading = bulk.phase === "uploading";
  const done = bulk.phase === "done";

  const successCount = bulk.files.filter((f) => f.status === "success").length;
  const errorCount = bulk.files.filter((f) => f.status === "error").length;

  return (
    <div className="container max-w-3xl py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Bulk resume upload</h1>
        <p className="text-sm text-muted-foreground">
          Drop multiple PDFs at once. Each runs through the same AI extraction +
          inference pipeline and lands in the review queue for HR approval.
        </p>
      </header>

      {idle && (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/30",
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drop PDFs here, or click to pick files
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Up to {MAX_FILES} files · 5MB each
            </p>
          </div>

          {pending.length > 0 && (
            <Card>
              <CardContent className="space-y-2 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {pending.length} file{pending.length === 1 ? "" : "s"} ready
                </div>
                {pending.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate" title={f.name}>
                      {f.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removePending(i)}
                      className="rounded-full p-1 transition-colors hover:bg-muted"
                      aria-label={`Remove ${f.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                <Button
                  onClick={startProcessing}
                  className="mt-2 w-full"
                  disabled={pending.length === 0}
                >
                  Process {pending.length} file{pending.length === 1 ? "" : "s"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!idle && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                {uploading && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Processing {bulk.files.length} file
                    {bulk.files.length === 1 ? "" : "s"}…
                  </>
                )}
                {done && (
                  <>
                    Done — {successCount} succeeded, {errorCount} failed
                  </>
                )}
              </div>
              {bulk.error && (
                <span className="text-sm text-destructive">{bulk.error}</span>
              )}
              <div className="ml-auto flex items-center gap-2">
                {done && successCount > 0 && (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/review">
                      <Inbox className="mr-1.5 h-3.5 w-3.5" />
                      Open review queue
                    </Link>
                  </Button>
                )}
                {(done || bulk.phase === "error") && (
                  <Button variant="ghost" size="sm" onClick={startOver}>
                    Start over
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              {bulk.files.map((f, i) => (
                <BulkFileRow key={f.index} file={f} index={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BulkFileRow({ file, index }: { file: BulkFileResult; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-2 rounded-md border p-2 text-sm"
    >
      <StatusIcon status={file.status} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium" title={file.filename}>
          {file.filename}
        </div>
        {file.status === "success" && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {file.extractedName || "(no name)"}
            </span>
            {" · "}
            {file.skillsCount ?? 0} skills · {file.projectsCount ?? 0} projects
            {file.inferredCount ? ` · +${file.inferredCount} inferred` : ""}
          </div>
        )}
        {file.status === "error" && (
          <div className="text-xs text-destructive">
            {file.error || "Failed"}
          </div>
        )}
        {file.status === "processing" && (
          <div className="text-xs text-muted-foreground">Extracting…</div>
        )}
        {file.status === "pending" && (
          <div className="text-xs text-muted-foreground">Waiting…</div>
        )}
      </div>
    </motion.div>
  );
}

function StatusIcon({ status }: { status: BulkFileStatus }) {
  if (status === "pending")
    return (
      <span className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40" />
    );
  if (status === "processing")
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
  if (status === "success")
    return (
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
    );
  return <XCircle className="h-4 w-4 shrink-0 text-destructive" />;
}
