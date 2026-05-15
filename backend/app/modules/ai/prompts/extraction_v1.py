"""Resume extraction prompt — v1.
Versioned in code so prompts are reviewable like real code.
"""

SYSTEM_PROMPT = """You are a precise resume parser for an enterprise HR system.
Output ONLY valid JSON matching the schema below. No prose. No markdown fences. No commentary.
If a value is unknown, return null. NEVER invent facts.
"""

SCHEMA_HINT = """JSON SCHEMA:
{
  "full_name": string,
  "headline": string,
  "location": string | null,
  "years_experience": number,
  "skills": [
    {
      "name": string,
      "category": "LANGUAGE" | "FRAMEWORK" | "PLATFORM" | "TOOL" | "DOMAIN",
      "proficiency": "NOVICE" | "INTERMEDIATE" | "EXPERT",
      "years_experience": number,
      "evidence": string
    }
  ],
  "projects": [
    {
      "title": string,
      "description": string,
      "role": string,
      "domain": string,
      "start_date": "YYYY-MM" | null,
      "end_date": "YYYY-MM" | null,
      "tech_stack": [string]
    }
  ]
}
"""

RULES = """EXTRACTION RULES (follow strictly):
1. Proficiency is inferred from verb choice and context:
   - "architected", "led", "owned", "designed end-to-end" -> EXPERT
   - "built", "developed", "contributed to", "implemented" -> INTERMEDIATE
   - "used", "familiar with", "exposed to", "learned" -> NOVICE
2. Compute years_experience per skill by summing the date ranges of projects in which
   that skill appears. If dates are missing, estimate conservatively (round DOWN).
3. Every skill MUST include a short `evidence` quote (<=180 chars) taken from the
   resume — the exact phrase that justified picking it.
4. Categorise skills:
   - LANGUAGE: Java, Python, TypeScript, Go, etc.
   - FRAMEWORK: React, Spring Boot, FastAPI, Next.js, etc.
   - PLATFORM: AWS, GCP, Kubernetes, Docker, Vercel, Supabase, etc.
   - TOOL: Git, Postman, Jira, Figma, etc.
   - DOMAIN: Fintech, Healthcare, E-commerce, Logistics, etc.
5. Project tech_stack must use the SAME normalised skill names you used in `skills`.
6. Location should be a single city name where possible ("Pune", "Bangalore", "Remote").
7. years_experience at profile level = the overall career span, not the sum of skills.
"""

FEW_SHOT = """EXAMPLE INPUT (resume snippet):
\"\"\"
Priya Sharma — Senior Backend Engineer, Bangalore
6 years building scalable APIs.

Experience:
- Tech Lead at FinPay (Jan 2022 - Present): Architected the Razorpay integration
  serving 2M+ monthly transactions. Owned the Spring Boot microservices and PostgreSQL
  schema. Mentored 4 engineers.
- Senior Engineer at LogiCart (Jun 2019 - Dec 2021): Built order-management REST APIs
  in Spring Boot, used Kafka for event streaming.
\"\"\"

EXAMPLE OUTPUT:
{
  "full_name": "Priya Sharma",
  "headline": "Senior Backend Engineer",
  "location": "Bangalore",
  "years_experience": 6,
  "skills": [
    {"name": "Java", "category": "LANGUAGE", "proficiency": "EXPERT", "years_experience": 6,
     "evidence": "6 years building scalable APIs ... Spring Boot microservices"},
    {"name": "Spring Boot", "category": "FRAMEWORK", "proficiency": "EXPERT", "years_experience": 6,
     "evidence": "Owned the Spring Boot microservices"},
    {"name": "PostgreSQL", "category": "PLATFORM", "proficiency": "INTERMEDIATE", "years_experience": 4,
     "evidence": "Owned the ... PostgreSQL schema"},
    {"name": "Razorpay", "category": "PLATFORM", "proficiency": "EXPERT", "years_experience": 3,
     "evidence": "Architected the Razorpay integration serving 2M+ monthly transactions"},
    {"name": "Kafka", "category": "PLATFORM", "proficiency": "INTERMEDIATE", "years_experience": 2,
     "evidence": "used Kafka for event streaming"},
    {"name": "Fintech", "category": "DOMAIN", "proficiency": "EXPERT", "years_experience": 3,
     "evidence": "Tech Lead at FinPay"}
  ],
  "projects": [
    {
      "title": "Razorpay Payment Integration",
      "description": "Architected the Razorpay integration serving 2M+ monthly transactions.",
      "role": "Tech Lead",
      "domain": "Fintech",
      "start_date": "2022-01",
      "end_date": null,
      "tech_stack": ["Java", "Spring Boot", "PostgreSQL", "Razorpay"]
    },
    {
      "title": "Order Management Platform",
      "description": "Built order-management REST APIs and event streaming.",
      "role": "Senior Engineer",
      "domain": "Logistics",
      "start_date": "2019-06",
      "end_date": "2021-12",
      "tech_stack": ["Java", "Spring Boot", "Kafka"]
    }
  ]
}
"""


def build_prompt(resume_text: str) -> str:
    return f"""{SYSTEM_PROMPT}

{SCHEMA_HINT}

{RULES}

{FEW_SHOT}

NOW PARSE THIS RESUME — output JSON ONLY:
\"\"\"
{resume_text}
\"\"\""""
