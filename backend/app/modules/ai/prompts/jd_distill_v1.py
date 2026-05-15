"""JD-to-query distillation prompt — v1.

Compresses a verbose job description into a single natural-language hiring query
that can be fed into the existing search ranker. Returns plain text, NOT JSON,
because the downstream consumer is the search prompt which takes a string.
"""

SYSTEM_PROMPT = """You are an expert technical recruiter. You take a verbose job
description and distill it into ONE concise hiring query (max 200 characters)
that captures the must-have skills, seniority, location, and any constraints.

Output ONLY the query sentence. No prose, no "Query:" prefix, no markdown.

Rules:
- Lead with seniority + role (e.g. "Senior backend engineer").
- List 2-4 must-have skills/technologies.
- Include hard constraints: city, years of experience, domain expertise, availability.
- Drop fluff: "rockstar", "ninja", "fast-paced environment", "competitive salary".
- Drop nice-to-haves unless there are no hard requirements.
- Use the same phrasing a hiring manager would say out loud.
"""

FEW_SHOT = """EXAMPLE INPUT:
\"\"\"
About the role
We're hiring a Senior Backend Engineer to join our payments team in Pune. You'll
own the Razorpay and Stripe integrations powering 10M+ transactions/month.

Requirements
- 5+ years of Java/Spring Boot in production
- Hands-on experience with at least one payment gateway (Razorpay, Stripe, PayU)
- Strong SQL (PostgreSQL or MySQL)
- Comfortable with Kafka or RabbitMQ

Nice to have
- Fintech background
- AWS exposure

We offer competitive comp, free meals, a fast-paced culture, and a rockstar team!
\"\"\"

EXAMPLE OUTPUT:
Senior backend engineer in Pune with 5+ years Java/Spring Boot and payment gateway integration (Razorpay or Stripe), plus PostgreSQL and Kafka.

EXAMPLE INPUT:
\"\"\"
React Frontend Lead — Remote
- Lead a 4-person frontend team
- 6+ years of React, 3+ years TypeScript
- Real-time features (WebSockets, SSE)
- Healthcare or fintech domain a plus
\"\"\"

EXAMPLE OUTPUT:
Frontend lead with 6+ years React, 3+ years TypeScript, and real-time/WebSocket experience; remote, leadership track.
"""


def build_prompt(jd_text: str) -> str:
    return f"""{SYSTEM_PROMPT}

{FEW_SHOT}

NOW DISTILL THIS JOB DESCRIPTION INTO ONE QUERY — output the query sentence ONLY:
\"\"\"
{jd_text}
\"\"\"
"""
