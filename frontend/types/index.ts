export type UserRole = "ADMIN" | "USER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
  employee_id?: string | null;
}

export type NextAction = "upload_resume" | "search";

export interface RegisterResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
  employee_id?: string | null;
  next_action: NextAction;
}

export interface MeResponse {
  user: User;
  employee_id?: string | null;
}

export type SkillCategory =
  | "LANGUAGE"
  | "FRAMEWORK"
  | "PLATFORM"
  | "TOOL"
  | "DOMAIN";

export type Proficiency = "NOVICE" | "INTERMEDIATE" | "EXPERT";
export type AllocationStatus = "ALLOCATED" | "UNALLOCATED" | "PARTIAL";
export type ProfileStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";
export type ReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EDITED_AND_APPROVED";

export interface Skill {
  id?: string;
  name: string;
  category: SkillCategory;
  proficiency: Proficiency;
  years_experience?: number | null;
  is_inferred?: boolean;
  inference_confidence?: number | null;
  inference_reason?: string | null;
  evidence?: string | null;
}

export interface Project {
  id?: string;
  title: string;
  description?: string | null;
  role?: string | null;
  domain?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  tech_stack: string[];
}

export interface Employee {
  id: string;
  user_id?: string | null;
  full_name: string;
  headline?: string | null;
  location?: string | null;
  years_experience?: number | null;
  allocation_status: AllocationStatus;
  last_project_end_date?: string | null;
  bio?: string | null;
  resume_url?: string | null;
  status: ProfileStatus;
  skills: Skill[];
  projects: Project[];
  created_at: string;
  updated_at: string;
}

export interface EmployeeListItem {
  id: string;
  full_name: string;
  headline?: string | null;
  location?: string | null;
  years_experience?: number | null;
  allocation_status: AllocationStatus;
  status: ProfileStatus;
  top_skills: string[];
}

export interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface InferredSkill {
  name: string;
  category: SkillCategory;
  proficiency: Proficiency;
  confidence: number;
  reason: string;
}

export interface ExtractedProfile {
  full_name: string;
  headline?: string | null;
  location?: string | null;
  years_experience?: number | null;
  skills: Skill[];
  projects: Project[];
}

export interface ResumeUploadResponse {
  employee: Employee;
  extracted: ExtractedProfile;
  inferred_skills: InferredSkill[];
  resume_url?: string | null;
}

export interface SearchResult {
  employee_id: string;
  name: string;
  headline?: string | null;
  location?: string | null;
  allocation_status?: AllocationStatus | null;
  match_score: number;
  reason: string;
  matched_skill_names: string[];
  evidence_snippets: string[];
}

export interface ReviewQueueItem {
  id: string;
  employee_id: string;
  submitted_by_user_id?: string | null;
  status: ReviewStatus;
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

export interface ReviewQueueItemWithEmployee {
  item: ReviewQueueItem;
  employee: Employee;
}

export interface TeamMember {
  employee_id: string;
  name: string;
  role_on_team: string;
  why_picked: string;
}

export interface TeamBuildResult {
  team: TeamMember[];
  rationale: string;
  alternates: { employee_id: string; name: string; would_replace: string }[];
}
