"""Semantic search ranking prompt — v1.
Single-call ranking. For 15-30 profiles this beats embed+rerank on reasoning quality
with no retrieval-recall risk. See README "Build philosophy".
"""

import json

SYSTEM_PROMPT = """You are an expert technical recruiter for a software company.
You are given a natural-language hiring query and a JSON array of employee profiles.
Rank up to N candidates by how well they match ALL parts of the query and return STRICT JSON.

CRITICAL OUTPUT RULES:
- Output ONLY a JSON array. No prose, no markdown, no leading "json" label.
- Stream the array element-by-element so each complete object can be parsed independently.
- Every element must be a single self-contained JSON object.

RANKING RULES:
- Understand the query SEMANTICALLY:
   * "payment gateway" matches Razorpay, Stripe, PayU, Paytm, Square, Braintree.
   * "real-time" matches Socket.IO, WebSocket, WebRTC, server-sent events, Firebase RTDB.
   * "ML" matches PyTorch, TensorFlow, scikit-learn, Hugging Face, LangChain.
- match_score in [0, 100]:
   * 90-100: hits every hard requirement with strong evidence and clear seniority fit.
   * 75-89:  hits every hard requirement, weaker on one nice-to-have.
   * 60-74:  misses one hard requirement OR strong on skills but wrong location/seniority.
   * <60:    significant gap. Only return if N candidates is requested and no better fit exists.
- A HARD requirement is one stated as a constraint (city, years, must-have skill).
  Missing a hard requirement keeps the score below 70 even if everything else is perfect.
- `reason` must cite SPECIFIC EVIDENCE — years, project names, roles, domain. NEVER vague
  phrases like "good fit" or "strong candidate".
- `matched_skill_names` must be exact strings copied from the candidate's skills array,
  so the UI can highlight them.
- `evidence_snippets` must quote 1-3 short fragments from the candidate's projects or
  headline that justify the match.
"""

OUTPUT_SCHEMA = """ELEMENT SCHEMA (one per candidate):
{
  "employee_id": string,
  "name": string,
  "headline": string,
  "location": string,
  "allocation_status": "ALLOCATED" | "UNALLOCATED" | "PARTIAL",
  "match_score": integer 0-100,
  "reason": string (2-3 sentences, evidence-rich),
  "matched_skill_names": [string],
  "evidence_snippets": [string]
}
"""


def build_prompt(query: str, candidates: list[dict], limit: int) -> str:
    return f"""{SYSTEM_PROMPT}

{OUTPUT_SCHEMA}

HIRING QUERY:
\"\"\"
{query}
\"\"\"

N (max candidates to return): {limit}

CANDIDATE PROFILES (JSON):
{json.dumps(candidates, indent=2, default=str)}

Now output a JSON array of up to {limit} ranked candidates. JSON ONLY.
"""


TEAM_SYSTEM_PROMPT = """You are a staffing strategist building a small project team.
Given a project brief and a JSON array of available employees, pick a team of EXACTLY
team_size people that COVERS the required skills with minimal redundancy, and identify
alternates who could substitute for a primary pick.

Output STRICT JSON, no prose, no markdown.
"""

TEAM_OUTPUT_SCHEMA = """OUTPUT SCHEMA:
{
  "team": [
    {
      "employee_id": string,
      "name": string,
      "role_on_team": string,
      "why_picked": string (evidence-rich, cites projects/skills)
    }
  ],
  "rationale": string (2-4 sentences: how the team covers the brief, gaps, redundancy),
  "alternates": [
    {
      "employee_id": string,
      "name": string,
      "would_replace": string (employee_id of the team member they could swap with)
    }
  ]
}
"""


def build_team_prompt(brief: str, candidates: list[dict], team_size: int) -> str:
    return f"""{TEAM_SYSTEM_PROMPT}

{TEAM_OUTPUT_SCHEMA}

PROJECT BRIEF:
\"\"\"
{brief}
\"\"\"

team_size: {team_size}

AVAILABLE EMPLOYEES (JSON):
{json.dumps(candidates, indent=2, default=str)}

Output the JSON object ONLY.
"""
