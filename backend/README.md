# SkillsHub — Backend

FastAPI + SQLAlchemy 2 (async) + Alembic + Pydantic v2 + Google Gemini.

```bash
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env  # fill DATABASE_URL, GOOGLE_API_KEY, JWT_SECRET …

alembic upgrade head
python -m scripts.seed_database
uvicorn app.main:app --reload
```

- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>

## Scripts (prompt iteration)

```bash
# Run extraction on a single resume PDF and print the JSON output.
python -m scripts.extract_one path/to/resume.pdf

# Run a single search query against the seeded data and print ranked results.
python -m scripts.search_one "backend dev in Pune with Java + payment gateway" 5
```

## Layout

```
app/
  core/        config | security | database | exceptions
  common/      dependencies | middleware | filters | decorators | utils
  modules/
    auth | users | employees | resumes | review | search | ai
  models.py    Aggregator import used by Alembic autogenerate
  main.py      bootstrap (CORS, request-id, OpenAPI bearer)
alembic/       versions/0001_initial.py
scripts/       seed_database.py | extract_one.py | search_one.py
seed_data/     profiles.json (15 deterministic demo profiles)
```

## AI module

`app/modules/ai/`:

- `client.py` — singleton `genai.Client` (free key: https://aistudio.google.com/apikey)
- `prompts/extraction_v1.py` — system prompt + JSON schema + few-shot + rules
- `prompts/inference_v1.py` — high-confidence (>= 0.7) related-skill inference
- `prompts/search_v1.py` — single-call ranking + team-builder prompts
- `service.py` — async wrappers; `stream_search_results` is the only streaming one
- `schemas.py` — Pydantic shapes returned by every AI call

Models:

- `GEMINI_MODEL_SHOWCASE` (default `gemini-2.5-pro`) — extraction + search
- `GEMINI_MODEL_LIGHT`   (default `gemini-2.5-flash`) — inference

## Error envelope

Every error response (HTTPException, AppError subclasses, validation, integrity, unhandled)
flows through `app/common/filters.py` into:

```json
{
  "success": false,
  "statusCode": 422,
  "message": "...",
  "timestamp": "ISO-8601",
  "path": "/api/...",
  "details": "..." // optional, validation errors only
}
```

Each request gets an `x-request-id` header (echoed on response, logged on errors).

## Authorization

- Employee users can read/edit only their own profile and resume uploads.
- HR (ADMIN) users can read every profile, run searches, and approve/reject review items.
- `app/modules/employees/service.py::ensure_can_view / ensure_can_edit` are the
  single-purpose guards used by the routers.
