import type { Project, Skill } from "@/types";

export interface CompletenessInput {
  headline?: string | null;
  location?: string | null;
  years_experience?: number | null | "";
  bio?: string | null;
  skills: Skill[];
  projects: Project[];
}

export interface CompletenessResult {
  score: number;
  filledItems: number;
  totalItems: number;
  missing: string[];
}

const ITEMS: { label: string; test: (i: CompletenessInput) => boolean }[] = [
  { label: "headline", test: (i) => !!i.headline && i.headline.trim().length > 0 },
  { label: "location", test: (i) => !!i.location && i.location.trim().length > 0 },
  {
    label: "years of experience",
    test: (i) =>
      typeof i.years_experience === "number" && i.years_experience > 0,
  },
  { label: "bio", test: (i) => !!i.bio && i.bio.trim().length > 0 },
  {
    label: "3+ skills",
    test: (i) => i.skills.filter((s) => !s.is_inferred).length >= 3,
  },
  { label: "a project", test: (i) => i.projects.length >= 1 },
];

export function computeProfileCompleteness(
  input: CompletenessInput,
): CompletenessResult {
  const passed = ITEMS.filter((item) => item.test(input));
  const missing = ITEMS.filter((item) => !item.test(input)).map((i) => i.label);
  const score = Math.round((passed.length / ITEMS.length) * 100);
  return {
    score,
    filledItems: passed.length,
    totalItems: ITEMS.length,
    missing,
  };
}
