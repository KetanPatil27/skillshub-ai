"""Related-skill inference prompt — v1."""

import json

SYSTEM_PROMPT = """You infer skills a developer almost certainly has, given the skills they have
explicitly listed on their resume. Return ONLY high-confidence inferences (confidence >= 0.7).
Output STRICT JSON. No prose, no markdown fences.

Rules:
- Maximum 5 inferences. Quality > quantity.
- Do NOT duplicate any skill that already appears in the input list.
- Each inference must be supported by a clear technical reason (e.g. dependency,
  shared toolchain, ecosystem co-membership).
- Confidence is a float in [0.7, 1.0]. Use higher values only when the relationship
  is essentially mechanical (Next.js -> React) and lower when it's strong-but-soft
  (Java -> JUnit).
- Proficiency must NOT exceed the proficiency of the strongest source skill.
"""

SCHEMA_HINT = """JSON OUTPUT SCHEMA:
[
  {
    "name": string,
    "category": "LANGUAGE" | "FRAMEWORK" | "PLATFORM" | "TOOL" | "DOMAIN",
    "proficiency": "NOVICE" | "INTERMEDIATE" | "EXPERT",
    "confidence": number,
    "reason": string
  }
]
"""

FEW_SHOT = """EXAMPLE INPUT:
[
  {"name": "Next.js", "proficiency": "EXPERT", "years_experience": 4},
  {"name": "TypeScript", "proficiency": "EXPERT", "years_experience": 5},
  {"name": "Tailwind CSS", "proficiency": "INTERMEDIATE", "years_experience": 2}
]

EXAMPLE OUTPUT:
[
  {"name": "React", "category": "FRAMEWORK", "proficiency": "EXPERT", "confidence": 0.98,
   "reason": "Next.js is built on top of React; 4 years of Next.js implies expert React knowledge."},
  {"name": "JavaScript", "category": "LANGUAGE", "proficiency": "EXPERT", "confidence": 0.97,
   "reason": "TypeScript is a superset of JavaScript and Next.js compiles to JS."},
  {"name": "HTML", "category": "LANGUAGE", "proficiency": "EXPERT", "confidence": 0.92,
   "reason": "Building UIs with React + Tailwind requires fluent HTML semantics."},
  {"name": "CSS", "category": "LANGUAGE", "proficiency": "INTERMEDIATE", "confidence": 0.88,
   "reason": "Tailwind generates utility CSS; intermediate CSS fluency is implied."}
]
"""


def build_prompt(explicit_skills: list[dict]) -> str:
    compact = [
        {
            "name": s["name"],
            "proficiency": s.get("proficiency"),
            "years_experience": s.get("years_experience"),
        }
        for s in explicit_skills
    ]
    forbidden = [s["name"] for s in compact]
    return f"""{SYSTEM_PROMPT}

{SCHEMA_HINT}

{FEW_SHOT}

NOW INFER FROM THIS SKILL LIST:
{json.dumps(compact, indent=2)}

HARD CONSTRAINT — your output MUST NOT contain any of these names
(case-insensitive match — they are already on the resume, repeating them
is forbidden):
{json.dumps(forbidden)}

If you cannot think of a high-confidence inference whose `name` is NOT in
the forbidden list above, return an empty array []. Returning a name from
the forbidden list invalidates the entire response.

Output JSON array ONLY:"""
