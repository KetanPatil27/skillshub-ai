# 🚀 SkillsHub — AI-Powered Skills Intelligence for Software Companies

> 💬 *"Stop pinging ten managers asking who knows React and has done payment integrations.*
> *Just ask SkillsHub in plain English and get ranked, reasoned answers in seconds."*

SkillsHub is a full-stack AI app that solves two real HR problems for a 200-person dev team:

1. 📄 **Resume → structured profile.** Drop a PDF. Watch it parse into clean editable skills, projects, and AI-inferred related skills (e.g. *Next.js + TypeScript → React + JavaScript*), each with a confidence score and a one-line reason.
2. 🔍 **Search in plain English.** *"Find me a backend dev in Pune with 3+ years of Java and payment-gateway integration."* Streamed result cards arrive one by one with a circular match-score, a plain-English reason, and an evidence tooltip citing exact resume snippets.

---

## ✨ Highlights at a Glance

| | |
|---|---|
| 🧠 **2 AI providers** | Hugging Face (primary) → Gemini (auto-fallback). No more quota panic. |
| ⚡ **Streamed results** | First card lands in ~2 seconds. SSE all the way. |
| 📦 **Bulk upload** | Drop up to 20 PDFs. Live per-file progress. |
| 📊 **Skills analytics** | Top skills, scarce skills, hiring recommendations. |
| ⭐ **Saved searches** | History + saved queries. Re-run with one click. |
| 👥 **Compare candidates** | Side-by-side view of 2+ profiles. |
| 📥 **Resume download** | Original PDFs stored and viewable inline. |
| 🔁 **Re-review on edit** | Owner edits an approved profile? It goes back to HR. |
| ⌨️ **Cmd+K shortcut** | Jump to search from anywhere. |
| 🎉 **Confetti on approve** | Because shipping a profile should feel good. |

---

## 📚 Docs & Project Materials

All project documents, guides, screenshots, demo videos, and reference material are mirrored in a shared Google Drive folder:

🔗 **[📂 Open the SkillsHub Drive folder](https://drive.google.com/drive/folders/1T_fyEQC8E9uAY85FYae75Em8T1vTxu4B?usp=sharing)**

---

## 🛠️ Tech Stack

| Layer        | Choice                                                                 |
|--------------|------------------------------------------------------------------------|
| 🖥️ Frontend  | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, Framer Motion, TanStack Query |
| 🐍 Backend   | FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic v2                    |
| 🗄️ Database  | Supabase Postgres (async via asyncpg)                                  |
| 🤖 AI        | **Hugging Face Inference** (Llama-3.1-8B by default) + **Google Gemini** (gemini-2.5-pro / 2.5-flash) as fallback |
| 📦 Storage   | Supabase Storage + raw PDF bytes stored in Postgres (graceful fallback) |
| 🔐 Auth      | Custom JWT (bcrypt + python-jose)                                      |

> 💡 **Why two AI providers?** Phase 1 ran on Gemini only — one rate-limit and the demo froze. Phase 2 adds Hugging Face as the primary provider and Gemini as the automatic fallback, so a single failure can't take the platform down.

---

## 🆕 What's New (Phase 2)

Things added since the initial commit, newest first:

- 💾 **Resume storage + download.** Every uploaded PDF is now stored as raw bytes in Postgres (`resume_content`) so HR can view the original from the profile sheet. A new `GET /employees/{id}/resume` endpoint streams it back inline.
- 🆚 **Compare candidates.** Pick 2+ from the directory grid, hit Compare, get a clean side-by-side. URL-shareable via `/compare?ids=A,B,C`.
- 🎯 **Streaming UI polish.** Better messages ("Reading the JD…", "Ranking candidates…"), CSV export of search results, evidence toggle on result cards, animated counters on analytics, confetti on approval.
- ⌨️ **Cmd+K / Ctrl+K shortcut.** Jump to the search input from anywhere. Hint shows `⌘K` on Mac, `Ctrl K` elsewhere.
- 🔁 **HF retries + bulk pacing.** Transient HF errors (429/503) now retry with backoff. Bulk uploads pace 1.5s between files so HF free-tier doesn't burst-rate-limit.
- 🗑️ **Smart reject.** Rejecting an unlinked (bulk-uploaded) profile now deletes it cleanly. Linked profiles still flip to REJECTED so the user can re-upload.
- 📦 **HR bulk resume upload.** New `/bulk-upload` page. Drop up to 20 PDFs. Server streams per-file SSE events (`file_start`, `file_done`, `file_error`, `done`). One file's failure never poisons the batch.
- 🚩 **Owner-edit re-review.** When an employee edits their own *approved* profile, it auto-flips back to `PENDING_REVIEW` and enqueues a fresh review item. The frontend shows a clear "sent to HR for re-review" toast.
- 📈 **Profile completeness meter.** 0–100% score with a colour-coded bar and a list of what's missing (headline, location, bio, 3+ skills, etc.).
- ⭐ **Saved searches + search history.** Save useful queries from the search header. The empty-state shows your last 10 queries as chips. Idempotent on `(user, query_text)`.
- 📊 **HR analytics dashboard.** New `/analytics` page: approved-profile counts, top skills (with expert-count overlay), skills-without-an-expert, location/allocation/category breakdowns, AI-inferred ratio, and deterministic hiring recommendations.
- 🤗 **Hugging Face primary + Gemini fallback.** Every AI call tries HF first; on failure, Gemini takes over. Configurable via `HUGGINGFACEHUB_API_TOKEN`, `HF_MODEL_ID`, `HF_RESUME_MODEL`.
- ⏱️ **Time-aware search.** Search prompt gets a `TEMPORAL CONTEXT` block (today, last-month-start, last-quarter-start) and every candidate carries `days_since_last_project_end`. Queries like *"haven't been on a new project in the last quarter"* are now interpreted correctly.
- 📋 **Paste-a-JD search.** `POST /search/jd` distills a verbose job description into a hiring query, then streams the same ranked results. The UI shows the distilled query as a pill so you see what the AI heard.
- 🛂 **Role-aware route guard.** Next.js middleware decodes the JWT (edge-safe, no `jose`) and bounces wrong-role traffic with a `?notice=` param. Backend still re-verifies on every call — middleware is a UX guard, not a security boundary.
- 👤 **`/auth/me` knows where to send you.** Returns `has_completed_profile: bool` — a logged-in employee with no skills lands on `/upload`, everyone else lands on `/profile`.
- 🔑 **Auth signup + rate limit.** Open employee signup and invite-coded HR signup (`/auth/register/employee`, `/auth/register/hr`), with a per-minute rate limiter. Demo one-click logins still work.

---

## 🏗️ Architecture

```
┌──────────────────────────┐       ┌──────────────────────────────────┐
│  Next.js 14 (Vercel)     │  JWT  │  FastAPI (Render/Docker)         │
│  - HR + Employee screens │ ────► │  - /auth /resumes /search /...   │
│  - SSE stream consumer   │  SSE  │  - Async SQLAlchemy → Postgres   │
│  - Cmd+K, comparison     │ ◄──── │  - HF → Gemini AI fallback       │
└──────────────────────────┘       └──────────────┬───────────────────┘
                                                  │
                              ┌───────────────────▼────────────────────┐
                              │  Supabase Postgres + Storage (resumes) │
                              └────────────────────────────────────────┘
```

### 📂 Backend layout

```
backend/
  app/
    core/        config, security, database, exceptions
    common/      dependencies, middleware, filters, decorators, rate_limit
    modules/
      auth/      register, login, rate-limited
      users/     /users/me
      employees/ model + service + CRUD + filtering + resume download
      resumes/   /resumes/upload + /resumes/bulk (SSE)
      review/    HR queue + approve / reject / edit-and-approve
      search/    /search (SSE) + /search/jd + /search/team + history + saved
      analytics/ /analytics/overview (HR dashboard)
      ai/        HF client + Gemini client + versioned prompts
        prompts/ extraction_v1, inference_v1, search_v1, jd_distill_v1
        hf_client.py, client.py, service.py
    main.py      bootstrap, OpenAPI bearer, CORS, request-id
  alembic/       0001_initial, 0002_saved_searches
  scripts/       seed_database, extract_one, search_one, migrate_resume_columns
  seed_data/     profiles.json (15 deterministic profiles)
```

### 📂 Frontend layout

```
frontend/
  app/
    (auth)/login                 One-click HR / Employee buttons
    (hr)/search                  🌟 Streaming AI search (with tabs: Search / JD / Team)
    (hr)/directory               Filterable grid + compare selection
    (hr)/review/[id]             Per-profile review screen
    (hr)/analytics               📊 Skills dashboard
    (hr)/bulk-upload             📦 Multi-PDF SSE upload
    (hr)/compare                 🆚 Side-by-side candidates
    (hr)/settings                Preferences
    (employee)/upload            🌟 Drag a PDF, watch AI magic
    (employee)/profile           Self-view + edit (auto re-review)
  components/
    ui/                          shadcn primitives
    shared/                      avatar, skill-pill, employee-sheet, completeness-meter,
                                 recently-viewed, global-shortcuts, streaming-indicator
    features/resume-upload       dropzone, extraction-progress, profile-editor
    features/search              search-input, result-card, search-history
    features/auth                sign-in, signup forms, password strength
  hooks/  lib/  types/  middleware.ts
```

---

## 💡 Build Philosophy

- 🧪 **AI spine first.** Prompts and extraction were validated as standalone Python scripts (`scripts/extract_one.py`, `scripts/search_one.py`) before any UI existed.
- 🎯 **Single-call ranking, not embeddings.** At 15–30 profiles, a single LLM call gives better reasoning quality with zero retrieval-recall risk. At >1k profiles we'd add an embedding prefilter.
- 🛡️ **Fallback over single point of failure.** HF first → Gemini second. JSON parsing tolerates fences. Inference errors degrade gracefully. Bulk uploads isolate per-file failures.
- 💎 **Magic screens get polish.** Upload + Search are where the demo wins or loses.
- 🔐 **Auth is intentionally minimal.** Two seeded accounts, one-click login. Real signup still works.
- 📝 **Prompts are versioned in code.** `extraction_v1.py`, `inference_v1.py`, `search_v1.py`, `jd_distill_v1.py`.

---

## 🚀 Setup

### 1️⃣ Supabase

1. Create a Supabase project at https://supabase.com.
2. Copy the **Session pooler connection string** (port 5432) from *Project Settings → Database → Connection pooling → Session*.
3. Create a storage bucket named `resumes`. Mark it **public** (read).

### 2️⃣ Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate     # Windows
# source .venv/bin/activate  # macOS / Linux

pip install -r requirements.txt
cp .env.example .env
# fill DATABASE_URL, DATABASE_URL_SYNC, JWT_SECRET, GOOGLE_API_KEY,
#      HUGGINGFACEHUB_API_TOKEN, SUPABASE_* …

alembic upgrade head
python -m scripts.seed_database

uvicorn app.main:app --reload
```

📖 Swagger at **http://localhost:8000/docs**.

### 3️⃣ Frontend

```bash
cd frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

npm install
npm run dev
```

🌐 Open **http://localhost:3000**.

### 4️⃣ Demo accounts (seeded)

| Role        | Email                  | Password  |
|-------------|------------------------|-----------|
| 👔 HR/ADMIN | `hr@skillshub.demo`    | `demo123` |
| 👤 Employee | `ravi@skillshub.demo`  | `demo123` |

Both are one-click buttons on the login page. They survive every reseed and are intended for fast judge evaluation — **do not remove them**.

---

## 📝 Creating Accounts

The seeded demo logins always work, and real signup is a parallel path.

### 👤 Employee signup (open self-service)

`POST /auth/register/employee`

```jsonc
{
  "name": "Asha Iyer",
  "email": "asha@example.com",
  "password": "Hunter2pass",      // ≥ 8 chars, ≥ 1 letter, ≥ 1 digit
  "confirm_password": "Hunter2pass"
}
```

Creates a `USER` account **plus** a stub Employee row in `PENDING_REVIEW`, so the next step is `/upload`.

### 👔 HR signup (invite-only)

`POST /auth/register/hr` — same body plus `invite_code`:

```jsonc
{
  "name": "Priya HR",
  "email": "priya.hr@example.com",
  "password": "Hunter2pass",
  "confirm_password": "Hunter2pass",
  "invite_code": "SKILLSHUB-HR-2026"
}
```

The demo code is `SKILLSHUB-HR-2026` (override via `HR_INVITE_CODE`). Wrong code returns 403 with *"Invalid invite code."*

### 🚩 Feature flags

```bash
ALLOW_EMPLOYEE_SIGNUP=false
ALLOW_HR_SIGNUP=false
PASSWORD_MIN_LENGTH=8
AUTH_RATE_LIMIT_PER_MINUTE=10   # 0 disables; in-memory, per worker
```

---

## 🎬 Demo Flow (3 Minutes for Judges)

1. 🔐 **`/login`** — Click *Login as HR*. (3 s)
2. 🔍 **`/search`** — Type:
   `Find me a backend dev in Pune with 3+ years of Java and payment gateway experience`
   - ✨ Result cards stream in with animated score badges.
   - 💡 Hover *Why this match?* on the top result — see cited resume snippets.
3. ⏱️ Search again: `Senior frontend folks who haven't been on a new project this quarter.`
   - Vikram and Neha bubble to the top with `last_project_end_date` cited.
4. 👥 **Build Team tab** — paste:
   `4-person team for a 3-month healthcare app: needs mobile + backend + DevOps`
   - One AI call produces team + rationale + alternates.
5. 📋 **From JD tab** — paste a real job description.
   - Watch the distilled query appear as a pill, then ranked results stream in.
6. 📊 **`/analytics`** — top skills, scarce skills, hiring recommendations.
7. 📦 **`/bulk-upload`** — drop 3-4 PDFs at once, watch SSE progress.
8. 👤 Log out, click **Login as Employee** → drop a PDF on `/upload`.
   - 4-step animated progress, then editable profile with amber **Inferred Skills**.
9. ✅ Log back in as HR → **Review Queue** → approve (🎉 confetti!) → search to see the new person.

---

## 🌐 API Quick Reference

Full Swagger at `/docs`. Quick samples:

```bash
# 🔑 Login
curl -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hr@skillshub.demo","password":"demo123"}'

# 📤 Upload a resume
curl -X POST http://localhost:8000/resumes/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/resume.pdf"

# 📦 Bulk upload (HR only, SSE)
curl -N -X POST http://localhost:8000/resumes/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@one.pdf" -F "files=@two.pdf"

# 🔍 Streaming search (HR only)
curl -N -X POST http://localhost:8000/search \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"query":"backend dev in Pune with Java + payment gateway","limit":5}'

# 📋 Search from a job description
curl -N -X POST http://localhost:8000/search/jd \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"job_description":"We are hiring a senior backend engineer ...","limit":5}'

# ⭐ Save a search
curl -X POST http://localhost:8000/search/saved \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"query_text":"backend in Pune","label":"Backend Pune"}'

# 📊 Analytics
curl http://localhost:8000/analytics/overview \
  -H "Authorization: Bearer $TOKEN"

# ✅ Approve a review item
curl -X POST http://localhost:8000/review/$ITEM_ID/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"notes":"LGTM"}'

# 👥 Team builder
curl -X POST http://localhost:8000/search/team \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"brief":"4-person team for a healthcare mobile app","team_size":4}'

# 📥 Download the original resume PDF
curl -O -J http://localhost:8000/employees/$EMP_ID/resume \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🧠 AI Models Used

| Model                              | Where it's used                                    | Why |
|------------------------------------|----------------------------------------------------|------|
| 🤗 Llama-3.1-8B-Instruct (HF)      | Search, inference, JD distillation (primary)       | Free, fast, JSON-good with fences stripped |
| 🤗 Qwen2.5-72B / Mistral-Large (HF, optional) | Resume extraction primary (configurable)  | Strong JSON adherence + ~100k context |
| 🌟 Gemini 2.5-pro                  | Fallback for extraction, search, team builder      | Best reasoning on long multi-constraint queries |
| ⚡ Gemini 2.5-flash                | Fallback for inference + JD distillation            | Fast, deterministic rewriting |

Swap any of these via `.env` — no code change needed.

---

## 🛣️ What We'd Build Next

- 🧮 **Embedding retrieval + rerank** when profile count > 1k. Reuse the same prompt as the rerank step.
- 🍪 **httpOnly cookie auth** instead of `localStorage` — closes the XSS exposure.
- 🔔 **Real-time review notifications** to HR (WebSocket).
- 🌳 **Skill graph** — visualise inferred-skill relationships across the org.
- 🔄 **Resume re-extraction job queue** — backfill when the prompt version bumps.
- ✅ **Calibration tests** — golden-set queries with expected top-3 IDs to catch prompt regressions.
- 👁️ **OCR for scanned PDFs** (Tesseract or Google Vision).
- 🛡️ **Prompt-injection defences** on raw resume text.
- 🔐 **SSO** (Google / Okta / Azure AD) for enterprise.

---

## 🚢 Deployment Notes

- 🐳 **Backend → Render.** Use the included Dockerfile. Set every backend env var. Bind to `0.0.0.0:$PORT`.
- ▲ **Frontend → Vercel.** Set `NEXT_PUBLIC_API_BASE_URL` to the Render URL. Add the Render URL to `CORS_ORIGINS` on the backend.
- 🗄️ **DB / Storage → Supabase.** Already managed.

---

## ⚖️ Trade-offs We Deliberately Took

| Decision | Why |
|----------|-----|
| 🎯 Single-call ranking over embeddings | Better reasoning at hackathon scale; no recall risk. |
| 🤗 HF primary + Gemini fallback | Removes single-point-of-failure on AI. |
| 👯 Two seeded one-click accounts | Judges shouldn't waste time on auth UX. |
| 🛟 JSON-mode + tolerant `safe_json_loads` | Models occasionally emit fences or labels; we just strip them. |
| 📚 Skills aggregator at `app/models.py` | Alembic autogenerate sees all models from one import. |
| 💾 Resume bytes stored in Postgres too | So a missing Supabase config doesn't lose the original PDF. |
| 🔑 JWT in `localStorage` for now | Fine for demo; documented for production. |
| 🌱 15 deterministic seed profiles | Avoids 15 LLM calls on first boot; demo never depends on a live extraction. |

---

## 📚 Docs & Project Materials

All project documents, guides, screenshots, demo videos, and reference material are mirrored in a shared Google Drive folder:

🔗 **[📂 Open the SkillsHub Drive folder](https://drive.google.com/drive/folders/1T_fyEQC8E9uAY85FYae75Em8T1vTxu4B?usp=sharing)**


### 🗂️ Also available in the Drive folder

- 🖼️ Project screenshots — Search, Upload, Review Queue, Analytics, Bulk Upload, Compare, Profile pages.
- 🎬 Demo recordings / walkthrough videos.
- 📑 Phase 1 + Phase 2 guides (PDF + DOCX copies).
- 🎤 Pitch deck (PPTX + PDF export).
- 📊 Architecture diagrams and AI pipeline visuals.
- 📝 Any additional notes, sketches, and reference material used during the build.

> 💡 **Tip:** If you're a judge, mentor, or new teammate — start with the [Drive folder](https://drive.google.com/drive/folders/1T_fyEQC8E9uAY85FYae75Em8T1vTxu4B?usp=sharing) for the visual tour, then dive into the Phase 1 + Phase 2 guides for the deep technical walkthrough.

---

## 🙌 Made with

Next.js • FastAPI • Tailwind • shadcn/ui • Framer Motion • Hugging Face • Google Gemini • Supabase • SQLAlchemy • Pydantic ❤️

> *Two screens, one AI spine, full audit log.* 🌟
