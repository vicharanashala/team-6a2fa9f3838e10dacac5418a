# My Contribution — Answer Queue (CSFAQ feature)

This folder contains everything needed to add the **Answer Queue**
screen to the VINS platform — the CSFAQ-style flow where an intern pulls
an open question from the queue, gets a 3-hour lock, and resolves it
either by pointing to an existing FAQ entry or proposing a new one.

It plugs into the existing `Query` and `FAQ` models — no new collections.

## What's inside

```
contribution/
├── backend/
│   ├── routes/answerQueue.js       ← new route file, drop in as-is
│   ├── models/Query.patch.md       ← 5 fields to add to Query.js
│   └── server.patch.md             ← 2 lines to add to server.js
└── frontend/
    ├── src/pages/AnswerQueue.jsx   ← new page, drop in as-is
    └── App.Layout.patch.md         ← route + sidebar entry to add
```

## Setup steps, in order

1. **Copy the new files into the real project:**
   ```bash
   cp contribution/backend/routes/answerQueue.js   vins/backend/routes/
   cp contribution/frontend/src/pages/AnswerQueue.jsx   vins/frontend/src/pages/
   ```

2. **Patch `Query.js`** — open `Query.patch.md` and add the 5 lock fields
   to the schema (lockedBy, lockedAt, lockExpiresAt, skipCount, isStalled).

3. **Patch `server.js`** — open `server.patch.md`, add the import and the
   `app.use('/api/answer-queue', ...)` line.

4. **Patch `App.jsx` and `Layout.jsx`** — open `App.Layout.patch.md`,
   add the route and the sidebar nav entry.

5. **Run it:**
   ```bash
   cd vins/backend && npm run dev
   cd vins/frontend && npm run dev
   ```
   Visit `/answer-queue` (or click "Answer Queue" in the sidebar).

## How it maps to the CSFAQ spec

| CSFAQ spec concept | Where it lives here |
|---|---|
| Asker raises a question | already exists — `RaiseQuery.jsx` / `POST /api/queries` |
| Answerer pulls from queue, 3-hr lock | **new** — `POST /api/answer-queue/pull` |
| Find FAQ → resolved | **new** — `POST /api/answer-queue/:id/answer` with `type: "find"`, reuses `FAQ` model |
| Create FAQ → admin review → superadmin | **new** answer recorded as `Pending Validation`; reuses the *existing* mentor "Add to Knowledge Base" toggle in `QueryDetail.jsx` for the actual admin approval step |
| Stalled question → admin steps in | `skipCount` / `isStalled` fields, surfaced in the queue stats |
| Points for answering | reuses `User.stats.reputation` and `stats.answersGiven` — no new field needed |

This intentionally does **not** duplicate the Admin Review Queue or
Superadmin FAQ Approval screens — those map cleanly onto the mentor
workflow that's already built in `QueryDetail.jsx`. This contribution
is scoped to the **Answerer** side only, which was the missing piece.

## What to tell your team

This is a complete, self-contained PR:
- 1 new backend route file
- 1 new frontend page
- small, clearly-documented patches to 4 existing files (each patch is
  a few lines, easy for your leader to review)
- zero new dependencies
- zero conflicts with anyone else's in-progress work, since no existing
  file is rewritten — only additive patches
