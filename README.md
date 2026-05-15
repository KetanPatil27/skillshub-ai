# SkillsHub — AI-powered skills intelligence for software companies

> "Stop pinging ten managers asking *who knows React and has done payment integrations*?
> Just ask SkillsHub in plain English and get ranked, reasoned answers in seconds."

SkillsHub is a hackathon-grade full-stack app that solves two real HR problems:

1. **Resume → structured profile.** Drop a PDF. Watch it parse into clean editable
   skills, projects, and inferred related skills (e.g. *Next.js + TypeScript → React + JavaScript*),
   each with a confidence score and a one-line reason.
2. **Search in plain English.** "Find me a backend dev in Pune with 3+ years of Java and
   payment-gateway integration." Streamed result cards arrive one by one with a circular
   match-score, a plain-English reason, and an evidence tooltip citing exact snippets.

---

## Stack

| Layer        | Choice                                                     |
|--------------|------------------------------------------------------------|
| Frontend     | Next.js 14 (App Router), TS, Tailwind, shadcn/ui, Framer Motion, TanStack Query |
| Backend      | FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic v2        |
| Database     | Supabase Postgres (async via asyncpg)                      |
| AI           | **Google Gemini** via `google-genai` — `gemini-2.5-pro` (showcase) + `gemini-2.5-flash` (inference) |
| Storage      | Supabase Storage (optional, gracefully degrades)           |
| Auth         | Custom JWT (bcrypt + python-jose)                          |

> **Note on AI provider.** The brief mentioned both Anthropic env vars and Google Gemini in
> the Tech Stack section. We followed the explicit Tech Stack choice (**Gemini**) — see
> `backend/app/modules/ai/`. Swapping to another LLM is one file (`client.py`).

---

## Recent updates

Things added since the initial commit, newest first:

- **Time-aware search.** The search prompt now gets a TEMPORAL CONTEXT block
  (today, last-month-start, last-quarter-start) and every candidate carries
  `days_since_last_project_end`. Queries like *"haven't been on a new project in
  the last quarter"* or *"shipped something in the last 30 days"* are now
  interpreted correctly instead of guessed at.
- **Paste-a-JD search.** New `POST /search/jd` endpoint. HR pastes a full job
  description; a fast Gemini call distills it into a hiring query, then the
  normal ranker streams results. The UI shows the distilled query as a pill so
  you can see what the AI heard.
- **Role-aware route guard.** The Next.js middleware now decodes the JWT (edge-
  safe, no `jose`) and bounces wrong-role traffic with a `?notice=` query param
  the layout reads to show a toast. Backend still re-verifies on every call —
  the middleware is a UX guard, not a security boundary.
- **`/auth/me` now tells the UI where to send you.** Returns
  `has_completed_profile: bool` so a logged-in employee with no skills yet lands
  on `/upload` and everyone else lands on `/profile`.
- **Auth signup + rate limit.** Open employee signup and invite-coded HR signup
  (`/auth/register/employee`, `/auth/register/hr`), with a per-minute in-memory
  rate limiter and a redesigned login/signup page. Demo one-click logins still
  work.

---

## Architecture

```
┌──────────────────────────┐       ┌──────────────────────────────────┐
│  Next.js 14 (Vercel)     │  JWT  │  FastAPI (Render/Docker)         │
│  - 2 magic screens       │ ────► │  - /auth /resumes /search /...   │
│  - SSE stream consumer   │  SSE  │  - Async SQLAlchemy → Postgres   │
└──────────────────────────┘ ◄──── │  - Gemini client (sync, wrapped) │
                                   └──────────────┬───────────────────┘
                                                  │
                              ┌───────────────────▼────────────────────┐
                              │  Supabase Postgres + Storage (resumes) │
                              └────────────────────────────────────────┘
```

### Backend layout
```
backend/
  app/
    core/        config, security, database, exceptions
    common/      dependencies, middleware, filters, decorators
    modules/
      auth/      register, login
      users/     model, /users/me
      employees/ model + service + CRUD + filtering + ownership
      resumes/   POST /resumes/upload pipeline
      review/    HR-only queue endpoints
      search/    POST /search (SSE) + /search/team
      ai/        Gemini client + versioned prompts + pure services
        prompts/ extraction_v1.py, inference_v1.py, search_v1.py
    main.py      bootstrap, OpenAPI bearer, CORS, request-id
  alembic/       initial migration (0001_initial.py)
  scripts/       seed_database.py, extract_one.py, search_one.py
  seed_data/     profiles.json (15 deterministic profiles)
```

### Frontend layout
```
frontend/
  app/
    (auth)/login              One-click HR / Employee buttons
    (hr)/search               THE MAGIC SCREEN #2 (SSE)
    (hr)/directory            Filterable grid
    (hr)/review               Queue + /review/[id] editor
    (employee)/upload         THE MAGIC SCREEN #1
    (employee)/profile        Self-view + edit
  components/
    ui/                       shadcn primitives
    shared/                   avatar, skill-pill, score-badge, app-shell, employee-sheet
    features/resume-upload    dropzone, extraction-progress, profile-editor
    features/search           search-input, result-card
  hooks/  lib/  types/  middleware.ts
```

---

## Build philosophy

- **AI spine first.** Prompts and extraction were validated as standalone Python scripts
  (`scripts/extract_one.py`, `scripts/search_one.py`) before any UI existed. The schema
  fell out of the AI output, not the other way round.
- **Single-call ranking, not embeddings.** For 15–30 profiles, a single-call ranking
  prompt gives demonstrably better reasoning quality with no retrieval-recall risk.
  Production scale (10k+ profiles) would switch to embedding-retrieval + rerank.
- **Two screens get lavish polish; the rest is functional.** Upload + Search are where
  the demo wins or loses.
- **Auth is intentionally minimal.** Two seeded accounts, one-click login. Registration
  still works for completeness.
- **Prompts are versioned in code.** `extraction_v1.py`, `inference_v1.py`, `search_v1.py`.

---

## Setup

### 1. Supabase

1. Create a Supabase project at https://supabase.com.
2. Copy the **Session pooler connection string** (port 5432) — it lives under
   *Project Settings → Database → Connection pooling → Session*.
3. Create a storage bucket named `resumes`. Mark it **public** (read).

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate     # Windows
# source .venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
cp .env.example .env
# fill DATABASE_URL, DATABASE_URL_SYNC, JWT_SECRET, GOOGLE_API_KEY, SUPABASE_* …

alembic upgrade head
python -m scripts.seed_database

uvicorn app.main:app --reload
```

Visit Swagger at **http://localhost:8000/docs**.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

npm install
npm run dev
```

Open **http://localhost:3000**.

### 4. Demo accounts (seeded)

| Role     | Email                  | Password  |
|----------|------------------------|-----------|
| HR/ADMIN | `hr@skillshub.demo`    | `demo123` |
| Employee | `ravi@skillshub.demo`  | `demo123` |

Both are exposed as one-click buttons on the login page. They survive every
reseed and are intended for fast judge evaluation — **do not remove them**.

---

## Creating accounts

Real signup is available alongside the seeded demos — the one-click logins
keep working, signup is a parallel path.

### Employee signup (open self-service)

`POST /auth/register/employee`

```jsonc
{
  "name": "Asha Iyer",
  "email": "asha@example.com",
  "password": "Hunter2pass",      // ≥ 8 chars, ≥ 1 letter, ≥ 1 digit
  "confirm_password": "Hunter2pass"
}
```

Creates a `USER` account **plus** a stub Employee row in `PENDING_REVIEW`, so
the next step is `/upload`. Response includes `next_action: "upload_resume"`
and the new `employee_id`.

### HR signup (invite-only)

`POST /auth/register/hr` — same body as above plus `invite_code`:

```jsonc
{
  "name": "Priya HR",
  "email": "priya.hr@example.com",
  "password": "Hunter2pass",
  "confirm_password": "Hunter2pass",
  "invite_code": "SKILLSHUB-HR-2026"   // value of HR_INVITE_CODE in .env
}
```

The demo code is `SKILLSHUB-HR-2026` (override via `HR_INVITE_CODE`). Wrong
code returns 403 with a generic *"Invalid invite code."* message — judges who
want to create their own HR account during evaluation can use the env value.

### Feature flags

Both signup endpoints can be disabled per-environment:

```bash
ALLOW_EMPLOYEE_SIGNUP=false
ALLOW_HR_SIGNUP=false
PASSWORD_MIN_LENGTH=8
AUTH_RATE_LIMIT_PER_MINUTE=10   # 0 disables; in-memory, per worker
```

Disabled endpoints return 403 with *"Signup is currently disabled. Please
contact your administrator."*

### Other auth endpoints

- `POST /auth/login` — returns `{ access_token, user, employee_id? }`.
  Wrong credentials always return 401 with the generic message
  *"Invalid email or password."* (no distinction between unknown email and
  wrong password).
- `GET /auth/me` — current user + `employee_id` if applicable. Used by the
  frontend to rehydrate session on refresh.

### Running the auth tests

```bash
cd backend
pytest tests/test_auth.py -v
```

Tests use unique per-run emails (UUID prefix) and hit the configured
`DATABASE_URL`; they don't clean up after themselves. Point at a throwaway
schema if you want isolation.

---

## Demo flow (3 minutes for judges)

1. **`/login`** — Click *Login as HR*. (3 s)
2. **`/search`** — Type:
   `Find me a backend dev in Pune with 3+ years of Java and payment gateway experience`
   - Watch the *Searching 15 profiles…* shimmer.
   - Result cards stream in with animated score badges.
   - Hover *Why this match?* on the top result — see the cited resume snippets.
3. Search again: `Senior frontend folks who haven't been on a new project this quarter.`
   - Vikram and Neha bubble to the top with `last_project_end_date` cited.
4. **Build Team tab** — paste:
   `4-person team for a 3-month healthcare app: needs mobile + backend + DevOps`
   - One AI call produces team + rationale + alternates.
5. Log out, click **Login as Employee** → **Upload Resume**.
   - Drop a PDF. Watch the 4-step animated progress.
   - The profile card fades in with editable skills and a separate amber **Inferred Skills**
     section (with confidence % on hover).
   - Click *Send for Review*.
6. Log back in as HR → **Review Queue** → approve the new profile → search again to see
   it appear in results.

---

## API quick reference

Full Swagger at `/docs`. Quick curl samples:

```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hr@skillshub.demo","password":"demo123"}'

# Upload a resume (replace TOKEN + path)
curl -X POST http://localhost:8000/resumes/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/resume.pdf"

# Streaming search (HR only)
curl -N -X POST http://localhost:8000/search \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"query":"backend dev in Pune with Java + payment gateway","limit":5}'

# Search from a job description (HR only) — distills then ranks
curl -N -X POST http://localhost:8000/search/jd \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"job_description":"We are hiring a senior backend engineer in Pune ... Java, Spring, payment gateways ...","limit":5}'

# Approve a review item
curl -X POST http://localhost:8000/review/$ITEM_ID/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"notes":"LGTM"}'

# Team builder
curl -X POST http://localhost:8000/search/team \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"brief":"4-person team for a healthcare mobile app","team_size":4}'
```

---

## What we'd build next

- **Embedding retrieval + rerank** once profile count > 1k. Reuse the same prompt as the
  rerank step.
- **httpOnly cookie auth** instead of localStorage. localStorage is fine for the demo;
  XSS exposure is the production concern.
- **Real-time review notifications** to HR (WebSocket).
- **Skill graph** — visualise inferred-skill relationships across the org.
- **Resume re-extraction job queue** — backfill when the prompt version bumps.
- **Calibration tests** — golden-set queries with expected top-3 IDs to catch prompt regressions.
- **PDF screenshot rendering** in the review screen.

---

## Deployment notes

- **Backend → Render.** Use the included Dockerfile. Set every backend env var. Bind to
  `0.0.0.0:$PORT`.
- **Frontend → Vercel.** Set `NEXT_PUBLIC_API_BASE_URL` to the Render URL. Add the Render
  URL to `CORS_ORIGINS` on the backend.
- **DB / Storage → Supabase.** Already managed.

---

## Trade-offs we deliberately took

| Decision | Why |
|----------|-----|
| Single-call ranking over embeddings | Better reasoning quality at hackathon scale; no recall risk. |
| Two seeded one-click accounts | Judges shouldn't waste time on auth UX. |
| JSON-mode + tolerant `safe_json_loads` | Gemini occasionally emits fences or labels; we just strip them. |
| Skills aggregator at `app/models.py` | Alembic autogenerate sees all models from one import. |
| Frontend stores JWT in `localStorage` | Fine for demo; documented for production. |
| 15 deterministic seed profiles | Avoids 15 LLM calls on first boot; demo never depends on a live extraction. |
