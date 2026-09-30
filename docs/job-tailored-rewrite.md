# Feature 6 — Job-Tailored CV Rewriting

Status: **planned, not built.** This file is the build spec. Nothing in
`server/src` or `client/src` has been changed for it yet.

---

## 1. What the feature does

The user picks one of their CVs and a job (pasted advert text, or a job from
the board), and the system produces a **rewritten version of that CV aimed at
that job**: a sharper professional summary, experience and project bullets
rewritten to use the advert's own vocabulary and strong action verbs, and the
skills section reordered so what the advert asks for comes first.

Nothing is saved automatically. The rewrite comes back as a **suggestion
panel beside the current text**, and the user accepts or rejects each section
on its own.

### Decisions already taken

| Question | Decision | Why |
| --- | --- | --- |
| Where the result goes | Preview panel, accept/reject per section | Nothing is overwritten silently; it demos well and is easy to explain in the viva |
| Job description source | Both — pasted text **and** a job from the `Job` collection | The job board already exists, so tailoring from a job detail page costs almost nothing |
| Rewrite engine | **Our own module in plain JavaScript.** No LLM API | TU rule: core logic must be the student's own module. Also free, offline, and cannot fail in the exam room |
| LLM later | Kept possible behind `services/rewriteService.js` | A Claude provider can be added later without restructuring anything |

The Claude API was priced up and rejected *for now*: it is pay-as-you-go
(roughly $0.01–$0.05 per rewrite depending on model), needs a card and
internet during the demo, and an external examiner can reasonably say the
rewriting is Anthropic's work rather than yours. See section 8 for how to
add it later as an optional enhancement.

> **The word "AI" in the UI.** Label the button *"Tailor to a job"*, not
> *"AI rewrite"*. The rewriter is a rule-based text transformer, and
> claiming it is AI is a claim you would have to defend in the viva.

---

## 2. How the rewriting actually works

This is the part that gets written up in `docs/algorithms.md` as an
algorithm. It reuses the modules that already exist — `textProcessor.js`,
`tfidf.js`, `skillsDictionary.js`, `actionVerbs.js` — and adds one new
algorithm file.

### Step 1 — Understand the job

1. Run the advert through `processText()` (`algorithms/textProcessor.js`).
2. Build its TF-IDF vector against the corpus of
   `data/seedJobDescriptions.json` (`algorithms/tfidf.js`).
3. `topTerms(vector, 25)` gives the terms that characterise **this** advert
   rather than adverts in general — these are the target keywords.
4. `findSkills(advertText, tokens)` (`data/skillsDictionary.js`) gives the
   canonical skills the advert asks for.

### Step 2 — Understand the CV

1. `cvToText(cv)` then `processText()` gives the CV's terms.
2. `findSkills()` over the CV gives the skills it already shows.
3. Compare the two sets:
   - **covered** — in both,
   - **missing** — in the advert, not in the CV,
   - **surplus** — in the CV, irrelevant to this advert.

### Step 3 — Rewrite each piece of text

The rewriter never invents facts. It only **re-words, re-orders and
annotates what the user already wrote.** That rule is what keeps the feature
honest, and it is the answer to "does it make things up?" in the viva:
it cannot, because it has no generator — every output word comes from the
user's own text, the advert, or a fixed phrase table.

Four transformations, applied in order to each bullet:

1. **Strip duty phrasing.** Leading `Responsible for `, `Duties included `,
   `Tasked with `, `Worked on `, `Helped with `, `In charge of ` are removed.
2. **Front an action verb.** If the bullet no longer starts with a word that
   `isActionVerb()` accepts, prepend one chosen from a small mapping table
   keyed on what the bullet is about (`test` → *Tested*, `design` →
   *Designed*, `api`/`endpoint` → *Built*, `team`/`junior` → *Led*, default
   *Delivered*). The verb comes from `data/actionVerbs.js`, and the choice is
   a table lookup, not a guess.
3. **Swap in the advert's vocabulary.** Where the CV and the advert mean the
   same thing but say it differently, use the advert's word — this is what
   an ATS keyword-matches on. Driven by the alias lists already in
   `skillsDictionary.js` (CV says "JS", advert says "JavaScript" → the
   bullet says "JavaScript"). Only ever swaps between known aliases of the
   *same* canonical skill, so it cannot change meaning.
4. **Flag missing quantification.** If the bullet contains no digit, attach a
   note (not text) — *"Add a number: how many, how much, how often?"* The
   rewriter does not invent a figure.

### Step 4 — Rewrite the summary

Rebuild the professional summary from parts the user already has:

```
<years or level> <headline / target job title>
with experience in <top 3 covered skills, using the advert's wording>.
<best existing summary sentence, duty-phrasing stripped>.
Seeking a <advert job title> role.
```

Every slot is filled from the CV or the advert. If a slot has no source, that
clause is dropped rather than filled with a guess. Target 40–60 words, which
is the same window `scoringConfig.js` already rewards.

### Step 5 — Reorder, never delete

- **Skills:** covered-and-wanted first, then the rest, in the CV's existing
  order within each group. Nothing is removed — hiding a real skill is the
  user's decision, not the tool's.
- **Experience and projects:** suggest a reorder so the entries whose text
  overlaps the advert most (cosine similarity per entry, using
  `algorithms/cosineSimilarity.js`) appear first. Returned as a suggested
  order the user can accept; the default answer is "keep my order".

### Step 6 — Report the change

For each suggestion return `{ before, after, changes[], note }` so the UI can
show *why*, and so the viva answer to "what did it change and why" is on the
screen. Also return an estimated strength-score delta by re-running
`cvStrengthScorer.js` over the rewritten CV.

---

## 3. Files to create

```
server/src/
├── algorithms/
│   └── cvRewriter.js          # everything in section 2, pure functions, no I/O
├── data/
│   └── rewritePhrases.js      # duty phrases to strip, topic → action verb table
├── services/
│   └── rewriteService.js      # provider switch: 'local' now, 'claude' later
├── controllers/
│   └── rewrite.controller.js
└── routes/
    └── rewrite.routes.js

client/src/
├── api/rewrite.js
├── components/cv/TailorPanel.jsx      # the suggestion UI
└── pages/user/CVEditorPage.jsx        # add a third tab: Content | Design | Tailor

server/tests/unit/cvRewriter.test.js
server/tests/integration/rewrite.test.js
docs/algorithms.md                     # add the rewriter section
docs/test-cases.md                     # add its rows
```

`cvRewriter.js` must stay pure — CV in, suggestions out, no database and no
network. That is what makes it unit-testable without Mongo and easy to
explain in isolation.

---

## 4. API

Follows the existing `{ success, data, message }` shape and the ownership
rules in `cv.controller.js` (`findOwnedCV`, 404 rather than 403).

**`POST /api/cvs/:id/tailor`** — auth required, owner only.

Request — one of `jobDescription` or `jobId`:

```json
{ "jobId": "665f…", "jobTitle": "Backend Developer" }
```

```json
{ "jobDescription": "We are hiring a backend developer…", "jobTitle": "Backend Developer" }
```

When `jobId` is given, load the `Job`, check it is not deleted, and use its
`title`, `description` and `skills`. Validate with `express-validator`:
`jobId` is a Mongo id, `jobDescription` is 50–8000 characters, exactly one of
the two is present.

Response:

```json
{
  "success": true,
  "message": "Rewrite ready",
  "data": {
    "jobTitle": "Backend Developer",
    "summary":  { "before": "…", "after": "…", "changes": ["…"] },
    "experience": [
      { "index": 0, "field": "description", "before": "…", "after": "…", "changes": ["…"], "note": "" },
      { "index": 0, "field": "achievements", "itemIndex": 1, "before": "…", "after": "…", "changes": [] }
    ],
    "projects": [],
    "skills": { "suggestedOrder": ["Node.js", "MongoDB"], "matched": [], "missing": [] },
    "sectionOrder": { "experience": [2, 0, 1] },
    "estimatedScore": { "before": 71, "after": 83 }
  }
}
```

The response is **advice only** — this route writes nothing to the CV. The
user applies what they accept through the existing `PUT /api/cvs/:id`, which
means autosave, validation and the activity log all keep working unchanged.

Rate-limit it (say 20 requests per 15 minutes per user, reusing the pattern
in `middleware/rateLimit.js`) — the work is CPU-bound over the whole seed
corpus.

### Logging and history

- Add `CV_TAILOR` to `ACTIVITY_ACTIONS` in `models/ActivityLog.js` and log
  every call with `meta: { jobId, jobTitle, missingCount }`.
- Optional, decide later: a `Rewrite` collection storing each suggestion set,
  so the user gets a history and the admin dashboard can report which
  keywords are most often missing. Only build this if the admin BI dashboard
  in Phase 6 actually needs it.

---

## 5. Client UI

Add a third tab to `CVEditorPage.jsx` beside Content and Design:
**Tailor**. Reuse the tab markup already there (lines ~208–229) — no new
layout is needed.

`TailorPanel.jsx`:

1. **Choose the job.** A radio pair — *Paste a job advert* (textarea, with a
   character counter and the 50–8000 limits shown) or *Pick from the job
   board* (a select populated from `listJobs()`).
2. **Tailor** button → spinner → suggestions.
3. **Suggestions.** One card per item: the current text, the suggested text,
   the list of changes, and **Accept** / **Keep mine**. Accepted items are
   merged into the editor's `cv` state through the existing `handleChange()`,
   so autosave picks them up exactly like typing would.
4. **Accept all** / **Reject all** at the top, and a running
   *"3 of 9 accepted"* counter.
5. A skills strip showing matched (green) and missing (amber) keywords, with
   *"Add to skills"* on each missing one.
6. The estimated score before → after, so the benefit is visible.

States to handle, per `CLAUDE.md` section 11: loading, empty (no jobs on the
board yet), error, and "nothing to improve" — a CV that is already well
written should say so rather than invent changes.

---

## 6. Tests

**Unit — `server/tests/unit/cvRewriter.test.js`** (no database needed):

| Test | Expectation |
| --- | --- |
| Strips duty phrasing | `"Responsible for testing the API"` → starts with an action verb |
| Keeps a good bullet | A bullet already starting with an action verb and containing a number is returned unchanged |
| Aliases swap to advert wording | CV "JS", advert "JavaScript" → output says "JavaScript" |
| Never invents a number | No digit in input → no digit in output, and a note is attached |
| Missing skills | Advert asks Docker, CV has none → `missing` contains "Docker" |
| Skill reorder keeps everything | Output skills are a permutation of the input, same length |
| Empty CV | Returns empty suggestions, does not throw |
| Summary word count | Rewritten summary lands in the 40–60 word window when the source has enough material |

**Integration — `server/tests/integration/rewrite.test.js`**, following
`tests/integration/cv.test.js`:

- 401 when signed out.
- 404 for another user's CV.
- 400 when neither `jobId` nor `jobDescription` is sent, and when both are.
- 200 with a pasted advert; response has `summary`, `experience`, `skills`.
- 200 with a `jobId` from the board.
- The CV in the database is **unchanged** after the call — this is the test
  that proves the route is advice-only.

---

## 7. Build order

Do it in this order; each step is testable on its own.

1. `data/rewritePhrases.js` — the phrase and verb tables.
2. `algorithms/cvRewriter.js` + its unit tests. **Stop here and check the
   output quality on a real CV before building any UI.** If the rewritten
   bullets are not better than the originals, the tables need work, and no
   amount of UI will hide that.
3. `services/rewriteService.js`, `rewrite.controller.js`, `rewrite.routes.js`,
   mounted in `routes/index.js`; `CV_TAILOR` added to `ACTIVITY_ACTIONS`.
4. Integration tests.
5. `client/src/api/rewrite.js` and `TailorPanel.jsx`, tab wired into
   `CVEditorPage.jsx`.
6. Documentation: the algorithm section in `docs/algorithms.md` (purpose,
   pseudocode, Mermaid flowchart, worked example), the module notes in
   `docs/implementation-notes.md`, the rows in `docs/test-cases.md`.

Commit after each step, e.g. `feat(rewrite): add cvRewriter algorithm`.

**This belongs after Phase 5.** The rewriter reuses the job-matching
pipeline, and `algorithms/jobMatcher.js` and the `JobMatch` model are not
written yet. Build the matcher first; the rewriter is then a short step from
it, and both get written up together in the report as one body of work.

---

## 8. Adding a real LLM later (optional, Phase "Later")

Only if you decide the local rewriter is not good enough, and only as an
**enhancement layer** — the local engine stays the graded algorithm.

- `services/rewriteService.js` already has the switch. Add
  `providers/claudeProvider.js` beside the local one and select with
  `REWRITE_PROVIDER=local|claude` in `server/.env`.
- Dependency: `@anthropic-ai/sdk`. Key: `ANTHROPIC_API_KEY`, read through
  `config/env.js` as an **optional** variable — the server must still start
  without it, and the provider must fall back to `local` when it is missing.
- Model: `claude-opus-5` (or `claude-haiku-4-5` to cut the cost roughly
  fivefold). Ask for structured JSON in the same response shape as section 4,
  so the controller, the client and the tests do not change at all.
- Never put the key in the repo. `.env` is already git-ignored; add
  `ANTHROPIC_API_KEY=` and `REWRITE_PROVIDER=local` to `server/.env.example`.
- Keep the same "never invent facts" instruction in the prompt, and keep the
  accept/reject UI — an LLM makes that rule more important, not less.
