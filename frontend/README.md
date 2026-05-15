# SkillsHub — Frontend

Next.js 14 (App Router) + TS + Tailwind + shadcn/ui + Framer Motion + TanStack Query.

```bash
cp .env.local.example .env.local   # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm install
npm run dev
```

Open <http://localhost:3000>. Login with one of the seeded accounts:

| Role     | Email                  | Password  |
|----------|------------------------|-----------|
| HR/ADMIN | `hr@skillshub.demo`    | `demo123` |
| Employee | `ravi@skillshub.demo`  | `demo123` |

## Route groups

- `(auth)/login` — one-click HR/Employee buttons + manual form fallback.
- `(hr)` — `/search`, `/directory`, `/review`, `/review/[id]` (protected by middleware).
- `(employee)` — `/profile`, `/upload`.

## Magic screens

### `app/(employee)/upload/page.tsx`
- `Dropzone` (Framer hover scale + border-color animation)
- `ExtractionProgress` — 4-step animated checklist; race-skips when the API returns
- `ProfileEditor` — inline editable card with explicit / **inferred** sections.
  Inferred pills show confidence on hover with ✓ / ✗ buttons.

### `app/(hr)/search/page.tsx`
- `SearchInput` — hero placeholder rotates every 3 s.
- `useSearch` — fetch + ReadableStream + SSE parser; appends `SearchResult`s as they arrive.
- `ResultCard` — staggered Framer reveal, animated `ScoreBadge` count-up, evidence tooltip.
- Team Builder tab reuses the same search backend.

## Hooks

- `use-auth` — login/logout, hydrated user from localStorage.
- `use-employees` — list / get / update / replace skills + projects (TanStack Query).
- `use-resume-upload` — multipart POST.
- `use-search` — POST + ReadableStream SSE parser + `useTeamBuilder`.
- `use-review-queue` — queue list, single item, approve/reject.

## Auth + middleware

JWT lives in `localStorage` **and** a `skillshub_token` cookie — the cookie exists only so
`middleware.ts` can route-guard `/(hr)/*` and `/(employee)/*` without a network call. The
Axios instance attaches the bearer token automatically and clears the session on 401.

## Theming

Tailwind tokens via shadcn (`globals.css`). `next-themes` toggles class `dark` on `<html>`.
A theme button lives in the sidebar footer.
