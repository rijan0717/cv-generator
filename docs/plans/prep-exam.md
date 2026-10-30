# Interview preparation and exams — plan

## 1. Goal

Let a user search for a job position, choose a level (junior, mid or senior), study the
questions asked for it — each with the correct answer and the reasoning behind it — and
then sit an automatically generated exam on the same material.

The admin owns the content: every position, every question, the four options, which one
is right, the explanation, and whether the position is offered to users at all.

Why it is worth doing (for the report and viva):

- **User value:** the app already tells somebody how well their CV matches a job. The
  obvious next question is "what will they ask me?", and nothing answers it today.
- **Reporting:** attempts, pass rates and most-missed topics are genuine business
  intelligence, feeding the admin dashboard and the report exports (requirement (b)).
- **Own module:** the exam paper is assembled by our own selection algorithm, not drawn
  at random and not by a quiz library (CLAUDE.md rule 1).

## 2. Decisions already made (do not re-ask)

| Question                   | Decision                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Question format            | **Multiple choice.** Four options, exactly one correct, plus a written explanation. The exam marks itself and the admin editor stays one simple form.         |
| Exam setup                 | **Per position.** The admin sets questions per exam, pass mark and an optional time limit. Defaults: 10 questions, 60%, untimed.                              |
| Scope                      | **Stands alone now, linked later.** Phase A is search → level → study → exam. A later phase suggests a position from the user's CV headline or last job match. |
| Who writes the questions   | The admin, through the admin panel. No import, no AI generation (CLAUDE.md rule 2).                                                                           |
| Levels                     | `junior`, `mid`, `senior`. A question belongs to exactly one level; a position may offer any combination.                                                     |

## 3. The algorithmic core

A bank of questions plus a quiz is CRUD, and CLAUDE.md requirement (c) asks for a
feature built on an algorithm or statistical method. Two pieces carry that weight, and
both are ours in plain JavaScript.

### A. Exam paper selection — `server/src/algorithms/examPaper.js`

Choosing N questions from a pool of (say) 40 is not a shuffle. A paper that happens to
ask six questions about the same topic has not tested the candidate on the position.

1. **Eligibility.** Active questions for this position and level.
2. **Weight each question.**
   - `base` — every question starts equal.
   - `recencyPenalty` — a question the user saw in their last attempt is damped, so a
     retake is not the same paper.
   - `wrongBonus` — a question they previously got **wrong** is weighted *up*. This is
     Leitner-style spaced repetition: the exam should return to what they failed.
   - `freshBonus` — a question they have never seen is weighted up slightly, so the bank
     is used evenly rather than the same favourites appearing forever.
3. **Greedy diversity pick.** Take the highest-weighted question, then damp every
   remaining question sharing its `topic` tag by a configured factor, and repeat until
   N are chosen. This is what stops one topic dominating.
4. **Shuffle the options** per sitting, so the correct answer is not always in the same
   position and a paper cannot be memorised as "B, C, A, D".

All weights live in one config object, `server/src/config/examConfig.js`, so they can be
explained and adjusted in one place — the same pattern as `scoringConfig.js`.

The function takes an optional `seed` so tests are deterministic.

### B. Result analysis — `server/src/algorithms/examScorer.js`

Returns the same shape as the CV strength scorer, for consistency:

```
{
  score,            // percentage
  passed,           // against the position's pass mark
  correctCount,
  breakdown: [{ topic, asked, correct, percentage }],
  weakestTopics: [string],
  suggestions: [string],
}
```

### C. Position search — `server/src/algorithms/positionSearch.js`

The user types "front end dev". Reuses `textProcessor.js` (`normaliseText`, `tokenise`,
`stem`) so that "developer" matches "dev" and "front end" matches "frontend", then
scores each position by weighted field: title hit > tag hit > description hit. No fuzzy
matching library (rule 1), and nothing more complicated than it needs to be.

## 4. Data model

### `InterviewPosition`

| Field                     | Notes                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| `title`                   | e.g. "Frontend Developer"                                          |
| `slug`                    | unique, from the title; the URL the user sees                      |
| `description`             | one paragraph shown on the position page                           |
| `industry`                | from `server/src/data/industries.js`, so filters match the rest    |
| `tags[]`                  | searchable keywords ("react", "css")                               |
| `levels[]`                | which of junior/mid/senior are offered                             |
| `examSettings`            | `{ questionCount, passMark, timeLimitMinutes }`                     |
| `isActive`                | whether it appears in the user's search                            |
| `isDeleted`, `timestamps` |                                                                    |

### `InterviewQuestion`

| Field                      | Notes                                                          |
| -------------------------- | -------------------------------------------------------------- |
| `position`                 | ref                                                            |
| `level`                    | `junior` \| `mid` \| `senior`                                  |
| `text`                     | the question                                                   |
| `options[]`                | exactly 4, each `{ text }`                                     |
| `correctIndex`             | 0–3                                                            |
| `explanation`              | the "why" — shown in study mode and in the exam review         |
| `topic`                    | one tag, used by the diversity pick and the breakdown          |
| `isActive`, `isDeleted`    |                                                                |

### `ExamAttempt`

| Field                   | Notes                                                                          |
| ----------------------- | ------------------------------------------------------------------------------ |
| `user`, `position`      | refs                                                                            |
| `level`                 |                                                                                 |
| `paper[]`               | **a frozen snapshot**, not refs: question text, the four options in the order   |
|                         | they were shown, and `correctIndex` within that order                           |
| `answers[]`             | the index the user chose, or null                                               |
| `score`, `passed`       |                                                                                 |
| `breakdown`             | from `examScorer`                                                               |
| `startedAt`             | the clock the time limit runs against — the server's, never the browser's      |
| `submittedAt`           | null while in progress                                                          |

**Why the paper is frozen.** The same reasoning as `Application.cv` in CLAUDE.md §6: an
admin editing or deleting a question afterwards must not change what somebody already
sat, or a past result becomes unexplainable. Shuffled option order is stored for the
same reason — the review screen has to show the paper as it was taken.

## 5. REST API

### User

| Route                                            | Notes                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `GET /api/interview/positions?search=&level=`    | Active only. Ranked by `positionSearch`.                                 |
| `GET /api/interview/positions/:slug`             | Detail, levels offered, question counts, exam settings.                 |
| `GET /api/interview/positions/:slug/study?level=`| **Study mode:** questions with the correct answer and the explanation.  |
| `POST /api/interview/exams`                      | Body `{ positionId, level }`. Builds the paper and starts the clock.    |
| `GET /api/interview/exams/:id`                   | Resume an attempt. **Correct answers stripped.**                        |
| `POST /api/interview/exams/:id/submit`           | Body `{ answers }`. Marks it, returns score, breakdown and full review. |
| `GET /api/interview/exams`                       | Own history, paginated.                                                 |

### Admin

| Route                                                  | Notes                                               |
| ------------------------------------------------------ | --------------------------------------------------- |
| `GET /api/admin/interview/positions`                   | Including inactive.                                 |
| `POST /api/admin/interview/positions`                  |                                                     |
| `PATCH /api/admin/interview/positions/:id`             | Title, description, levels, exam settings, isActive |
| `DELETE /api/admin/interview/positions/:id`            | Soft.                                               |
| `GET /api/admin/interview/positions/:id/questions`     | Grouped by level.                                   |
| `POST /api/admin/interview/questions`                  |                                                     |
| `PATCH /api/admin/interview/questions/:id`             |                                                     |
| `DELETE /api/admin/interview/questions/:id`            | Soft.                                               |
| `GET /api/admin/interview/stats`                       | Attempts, pass rate, most-missed questions.         |

## 6. The two rules the server must not break

1. **A correct answer never reaches the browser during an exam.** `correctIndex` and
   `explanation` are stripped from `POST /api/interview/exams` and
   `GET /api/interview/exams/:id`. Otherwise the answers are in the network tab and the
   exam means nothing. There is an integration test for exactly this.
2. **A position cannot be activated until it can actually examine somebody.** Every
   offered level needs at least `examSettings.questionCount` active questions. The
   `PATCH` refuses otherwise, with a message saying which level is short and by how
   many. This is what makes "the exam is automatic once active" safe rather than a
   runtime failure in front of a user.

## 7. Screens

### User

- **`/interview`** — search box, level chips, results as cards (title, industry,
  question count, levels offered).
- **`/interview/:slug`** — the position; pick a level; "Study" and "Take the exam".
- **`/interview/:slug/study?level=`** — the questions one per card: the question, the
  four options with the right one marked, and the explanation underneath. Progress is
  remembered so a long list can be worked through in sittings.
- **`/interview/:slug/exam/:attemptId`** — one question at a time, a progress bar, the
  timer when the position sets one, previous/next, and a submit that confirms first.
- **Result** — score, pass or fail against the pass mark, the per-topic breakdown, and
  a full review of every question showing what they chose, what was right and why.

### Admin — "Interview preparation"

- **Positions list** — searchable, with question counts per level, active state, and
  the warning badge when a position cannot be activated yet.
- **Position editor** — details, levels offered, exam settings, activate/deactivate.
- **Questions** — grouped by level, inline add and edit: question text, four options,
  a radio marking the correct one, the explanation, the topic tag, active toggle.
- **Stats** — attempts over time, pass rate by position, the ten most-missed questions.

## 8. Phases

Each stops for review, as CLAUDE.md §3 requires.

| Phase | Scope                                                                        |
| ----- | ---------------------------------------------------------------------------- |
| 8.1   | Models, admin CRUD API and admin screens, the activation guard               |
| 8.2   | User search, position page, study mode                                       |
| 8.3   | `examPaper`, `examScorer`, sitting an exam, marking, the review screen       |
| 8.4   | History, admin stats, report export, activity logging                        |
| 8.5   | The link back: suggest a position from the CV headline or last job match     |

A seed script, `npm run seed:interview`, fills three positions with about 30 questions
each so the feature can be demonstrated without an hour of typing first.

## 9. Tests

**Unit** (`server/tests/unit/`)

- `examPaper` never returns the same question twice.
- `examPaper` spreads topics rather than taking all from one.
- A previously wrong question is more likely to reappear than a previously correct one.
- The same seed gives the same paper; a different seed does not.
- `examScorer` marks a known paper correctly, including an unanswered question.
- `positionSearch` matches "front end dev" to "Frontend Developer".

**Integration** (`server/tests/integration/`)

- Starting an exam returns no `correctIndex` anywhere in the payload.
- Submitting marks and stores the attempt; a second submit is refused.
- Editing a question afterwards does not change a submitted attempt.
- A position with too few questions cannot be activated.
- A user cannot read another user's attempt.

## 10. Documentation

- `docs/algorithms.md` — add the selection weights, the diversity pick and a worked
  example of a paper being built.
- `docs/test-cases.md` — the tests above, in the report's table format.
- `docs/implementation-notes.md` — the new modules.
- The ER diagram gains three collections.

## 11. Effort estimate

| Phase | Rough size                       |
| ----- | -------------------------------- |
| 8.1   | Largest — two models, full CRUD  |
| 8.2   | Medium                           |
| 8.3   | Medium, the algorithms are small |
| 8.4   | Small                            |
| 8.5   | Small                            |

## 12. Open questions

1. Should a user be able to **retake** an exam freely, or is there a cooldown? Free
   retakes are simplest and the `wrongBonus` weighting already makes a retake useful
   rather than identical. Assumed: free.
2. Should study mode be available **before** the exam, after it, or both? Assumed:
   both, since hiding it would only push people to a search engine.
3. Does a failed attempt count towards anything, or is it just history? Assumed:
   history only.
