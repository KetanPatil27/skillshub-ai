"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { Dropzone } from "@/components/features/resume-upload/dropzone";
import { ExtractionProgress } from "@/components/features/resume-upload/extraction-progress";
import {
  ProfileEditor,
  type ProfileEditorState,
} from "@/components/features/resume-upload/profile-editor";
import { useResumeUpload } from "@/hooks/use-resume-upload";
import { useUpdateEmployee, useReplaceSkills, useReplaceProjects } from "@/hooks/use-employees";
import { errorMessage } from "@/lib/api";
import type { Employee } from "@/types";

type Phase = "idle" | "processing" | "ready";

export default function UploadPage() {
  const upload = useResumeUpload();
  const [phase, setPhase] = useState<Phase>("idle");
  const [employee, setEmployee] = useState<Employee | null>(null);

  async function onFile(file: File) {
    setPhase("processing");
    setEmployee(null);
    try {
      const res = await upload.mutateAsync(file);
      setEmployee(res.employee);
      setPhase("ready");
      toast.success("Resume parsed. Review and send for approval.");
    } catch (e) {
      toast.error(errorMessage(e));
      setPhase("idle");
    }
  }

  return (
    <div className="container max-w-3xl py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Upload your resume</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll pull out your skills, projects, and infer related ones — you stay in control.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="dz"
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Dropzone onFile={onFile} disabled={upload.isPending} />
          </motion.div>
        )}
        {phase === "processing" && (
          <motion.div key="prog" exit={{ opacity: 0 }}>
            <ExtractionProgress complete={!upload.isPending && upload.isSuccess} />
          </motion.div>
        )}
        {phase === "ready" && employee && (
          <motion.div key="editor">
            <Editor employee={employee} onResetSnapshot={(e) => setEmployee(e)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Editor({
  employee,
  onResetSnapshot,
}: {
  employee: Employee;
  onResetSnapshot: (e: Employee) => void;
}) {
  const update = useUpdateEmployee(employee.id);
  const replaceSkills = useReplaceSkills(employee.id);
  const replaceProjects = useReplaceProjects(employee.id);

  async function save(state: ProfileEditorState, message: string) {
    try {
      await update.mutateAsync({
        full_name: state.full_name,
        headline: state.headline,
        location: state.location,
        years_experience:
          state.years_experience === "" ? null : Number(state.years_experience),
        bio: state.bio,
        allocation_status: state.allocation_status,
      } as any);
      const next = await replaceSkills.mutateAsync(state.skills);
      const final = await replaceProjects.mutateAsync(state.projects);
      onResetSnapshot(final);
      toast.success(message);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <ProfileEditor
      employee={employee}
      submitting={update.isPending || replaceSkills.isPending || replaceProjects.isPending}
      onSubmit={(s) => save(s, "Sent for review — HR will see it shortly.")}
      onSecondary={(s) => save(s, "Draft saved.")}
    />
  );
}
