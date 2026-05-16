"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  ProfileEditor,
  type ProfileEditorState,
} from "@/components/features/resume-upload/profile-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useReplaceProjects,
  useReplaceSkills,
  useUpdateEmployee,
} from "@/hooks/use-employees";
import {
  useApproveReview,
  useRejectReview,
  useReviewItem,
} from "@/hooks/use-review-queue";
import { errorMessage } from "@/lib/api";

export default function ReviewItemPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, isLoading } = useReviewItem(params.id);
  const approve = useApproveReview(params.id);
  const reject = useRejectReview(params.id);

  const employeeId = data?.employee.id ?? "";
  const update = useUpdateEmployee(employeeId);
  const skills = useReplaceSkills(employeeId);
  const projects = useReplaceProjects(employeeId);

  const [snapshot, setSnapshot] = useState<ProfileEditorState | null>(null);

  async function saveEdits(state: ProfileEditorState) {
    if (!employeeId) return;
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
      await skills.mutateAsync(state.skills);
      await projects.mutateAsync(state.projects);
      setSnapshot(state);
      toast.success("Edits saved.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function onApprove() {
    if (snapshot) await saveEdits(snapshot);
    try {
      await approve.mutateAsync(undefined);
      toast.success("Profile approved.");
      
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      setTimeout(() => {
        router.push("/review");
      }, 1500);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function onReject() {
    try {
      await reject.mutateAsync(undefined);
      toast.message("Profile rejected.");
      router.push("/review");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-2">
        <Button asChild size="sm" variant="ghost">
          <Link href="/review">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to queue
          </Link>
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <ProfileEditor
            employee={data.employee}
            onSubmit={(s) => saveEdits(s)}
            primaryLabel="Save edits"
            onSecondary={undefined}
            submitting={
              update.isPending || skills.isPending || projects.isPending
            }
          />
          <div className="mt-6 flex flex-wrap gap-3 border-t pt-6">
            <Button onClick={onApprove} disabled={approve.isPending}>
              {approve.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve profile
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={reject.isPending}
            >
              Reject
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
