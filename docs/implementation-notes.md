# Implementation Notes

Supports report section **4.1.2 Implementation details**. One section per phase;
each is filled in as the phase is completed.

---

## Phase 0 — Project setup

### Repository layout

The project is a single Git repository containing two packages: `client`
(React) and `server` (Express). The root `package.json` holds the scripts a
developer actually runs and delegates to each package with `--prefix`;
`concurrently` starts both with `npm run dev`.

npm workspaces were tried first but had to be abandoned. During the initial
setup the toolchain ran on Windows against the WSL filesystem over
`\\wsl.localhost`, and npm could not create the workspace symbolic links across
that path. Each package therefore keeps its own `node_modules`, and
`npm run install:all` installs all three in order.

The toolchain was subsequently moved into WSL entirely (see `docs/mongodb.md`
section 8), where workspaces would now work — but the `--prefix` arrangement
was kept because it is simpler to explain and works identically on either
platform.

### Development environment

Node.js 22.22.1, npm 11.20.0 and MongoDB 8.0.32 all run natively inside WSL2
Ubuntu 26.04. `scripts/setup-wsl.sh` installs and configures the whole
environment in one repeatable step, which matters because the project has to
be set up again on the machine used for the demo.

### `server/src/config/env.js`

The only module in the server that reads `process.env`. It loads `server/.env`
with dotenv and exports one `env` object. Required settings (`MONGODB_URI`,
`JWT_SECRET`) throw at start-up if missing, so a misconfiguration fails
immediately with a clear message instead of causing an unexplained error on the
first request.

### `server/src/config/db.js`

`connectDB(uri)` opens the Mongoose connection with `strictQuery` enabled, so
queries on fields that are not in the schema are rejected rather than silently
ignored. `disconnectDB()` is used by graceful shutdown and by tests.

### `server/src/app.js` and `server/src/server.js`

These are deliberately separate:

- `app.js` exports `createApp()`, which builds and returns a configured Express
  application **without listening on a port**. Tests import this directly and
  drive it with Supertest, so no real network port is needed.
- `server.js` connects to MongoDB, calls `createApp()`, listens on `PORT`, and
  handles `SIGINT`/`SIGTERM` by closing the HTTP server and the database
  connection before exiting.

Middleware order in `createApp()` matters and is:

1. `helmet` — secure response headers
2. `cors` — restricted to `CLIENT_URL` with `credentials: true`, so the browser
   sends the authentication cookie
3. body parsers and `cookie-parser`
4. `morgan` request logging (skipped while testing)
5. static `/uploads`
6. the `/api` router
7. `notFound`, then `errorHandler` — these must be last, because Express
   matches middleware in registration order

### Error handling

Two pieces work together:

- `ApiError` (`src/utils/ApiError.js`) — an `Error` subclass carrying an HTTP
  status code and optional field-level details, with static helpers
  (`badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`).
- `errorHandler` (`src/middleware/errorHandler.js`) — the single place where
  errors become HTTP responses. It translates Mongoose `CastError`,
  `ValidationError` and MongoDB duplicate-key errors (code 11000) into sensible
  status codes and messages, hides internal detail in production, and always
  replies in the standard shape.

`asyncHandler` (`src/utils/asyncHandler.js`) wraps async route handlers so a
rejected promise is forwarded to `errorHandler` automatically. This is why
controllers in later phases contain no `try`/`catch` blocks.

### Response shape

`sendSuccess` and `sendCreated` (`src/utils/apiResponse.js`) guarantee every
successful response is `{ success, data, message }`, matching the error shape
produced by `errorHandler`. The client can therefore handle all responses with
the same code path.

### Health check

`GET /api/health` reports server uptime and the Mongoose connection state. It
is used to confirm the stack is wired up and during the deployment demo.

### Client setup

- `client/vite.config.js` proxies `/api` and `/uploads` to
  `http://localhost:5000`. Because the browser sees a single origin during
  development, the authentication cookie works without extra CORS handling.
- `client/src/api/axios.js` is the one shared Axios instance. It sets
  `withCredentials: true` and uses a response interceptor to replace the
  generic Axios error message with the server's `message` field, so components
  can display errors without knowing about Axios.

---

## Phase 1 — Authentication and profile

### Why the password is never stored

`server/src/models/User.js` holds a `passwordHash` field, never a password.
Three details make that safe, and each is worth being able to point at:

1. **Hashing happens in a `pre('save')` hook**, so it cannot be forgotten at a
   call site. Controllers assign the plain password to `passwordHash` and the
   model hashes it on the way to the database. bcrypt is used with a cost
   factor of 12, which is deliberately slow to compute and therefore slow to
   brute-force.
2. **The hook is guarded with `isModified('passwordHash')`.** Without that
   guard, saving a profile change would hash the existing hash a second time
   and lock the user out of their own account.
3. **The field is declared `select: false`**, so it is left out of every query
   unless a caller explicitly asks with `.select('+passwordHash')`. Login is
   the only place that does.

`toPublicJSON()` is the other half of the protection: responses are built from
it rather than from the raw document, so there is no path by which a hash can
reach the client. A test asserts this directly by searching the whole response
body for the string `passwordHash`.

### Sessions: a JWT in an httpOnly cookie

`server/src/services/tokenService.js` signs a JWT holding the user id and role,
and writes it to an httpOnly cookie. The token is deliberately **not** returned
in the response body and **not** stored in `localStorage`, because anything in
`localStorage` is readable by JavaScript — which turns any cross-site scripting
bug into a stolen session. An httpOnly cookie cannot be read by page scripts at
all.

The cookie is `sameSite: 'lax'`, so it is sent on ordinary navigation but not on
a cross-site form post, and `secure` in production so it never travels over
plain HTTP. `setAuthCookie` and `clearAuthCookie` share one options builder,
because a cookie is only cleared if the options match the ones it was set with.

### Authentication and authorisation middleware

`requireAuth` (`middleware/auth.js`) reads the cookie, verifies the token,
loads the user and attaches it to `req.user`. Two decisions in it are worth
explaining:

- An invalid token and an expired token produce the **same** message, so the
  response tells someone guessing tokens nothing useful.
- The **blocked** check happens here, not only at login. A user blocked by an
  admin mid-session loses access on their very next request, instead of when
  their week-long token eventually expires.

`requireRole(...roles)` (`middleware/role.js`) runs after `requireAuth` and is
the basis of the admin area in Phase 6.

### Not leaking which email addresses are registered

In `login`, a wrong email and a wrong password return exactly the same status
and the same message, `"Incorrect email or password"`. If they differed, anyone
could use the login form to discover which addresses have accounts. A test
asserts the two responses are identical.

### Admin accounts

`POST /api/auth/register` hard-codes `role: 'user'`. Sending `role: 'admin'` in
the request body does nothing, and a test proves it. The only way an admin can
come into existence is `scripts/seedAdmin.js`, which reads credentials from
`server/.env`. The script re-applies the same password policy the API enforces,
refuses to run with the example password still in place, and is safe to re-run:
an existing account is reset to admin rather than duplicated.

### Validation

Rules live with the routes using express-validator, and `middleware/validate.js`
turns any failures into the standard error shape. The first failure becomes the
headline `message`, while the full list is returned as `errors` with a `field`
on each, which is what lets a form show a message under the right input.

The password policy — at least 8 characters, with at least one letter and one
number — is expressed as three separate checks rather than one regular
expression, so the user is told precisely which rule they missed.

### Rate limiting

`middleware/rateLimit.js` allows 10 login attempts per 15 minutes and 5 new
accounts per hour, per IP address. Login uses `skipSuccessfulRequests`, so
someone signing in legitimately several times is never locked out; only failed
attempts count. Both limiters are replaced by a pass-through in the test
environment, since a suite that logs in repeatedly would otherwise start
failing part-way through.

### Uploads

`middleware/upload.js` writes to `server/uploads/` on local disk — no
third-party storage. The original filename is discarded entirely and replaced
with a timestamp plus 16 random bytes, which removes any possibility of a
path-traversal or overwrite attack through a crafted filename. Type and size
are checked by multer, and `handleUploadErrors` turns multer's own errors into
the project's `ApiError` so an oversized file gives a clear message instead of
a generic 500.

When an avatar is replaced, the previous file is deleted so the uploads folder
does not grow without limit. That deletion is best-effort: failing to remove an
old file must not fail the request.

### Client: the authentication context

The session lives in a cookie the browser will not let JavaScript read, so the
client cannot inspect it. `AuthProvider` therefore asks the server once on
start-up with `GET /api/auth/me` and keeps the answer in state.

The `isLoading` flag this produces matters more than it looks. Route guards
must wait for that first request to finish; if they redirect while it is still
in flight, a logged-in user is thrown out to the login page on every page
refresh.

The context object lives in its own file, `context/authContext.js`, apart from
the provider component in `AuthContext.jsx`. React Fast Refresh can only update
a module that exports components alone, so keeping them together would break
hot reloading. `useAuth` is in a third file for the same reason.

### Client: route guards

`ProtectedRoute` and `AdminRoute` are layout routes wrapping the pages they
protect. `ProtectedRoute` records where the user was heading in
`location.state.from`, so the login page can send them back there afterwards.
`AdminRoute` sends a logged-in non-admin to their own dashboard rather than to
the login page, because logging in again would not help them.

These guards are a **convenience, not a security control**. They stop a visitor
seeing a page that would not work. The real protection is on the server, where
every route checks the session and, from Phase 2, the ownership of the resource
being touched.

### Client: accessibility

`TextField` gives each input a real `<label htmlFor>` and, when invalid, sets
`aria-invalid` and points `aria-describedby` at the message, so a screen reader
reads the error together with the field. `Alert` uses `role="alert"` for errors
so they are announced as soon as they appear. The layout starts with a "Skip to
content" link for keyboard users.

---

## Phase 2 — CV model, CRUD and builder

_To be completed._

---

## Phase 3 — Templates and customisation

_To be completed._

---

## Phase 4 — PDF and Excel export

_To be completed._

---

## Phase 5 — Strength score and job matching

_To be completed._

---

## Phase 6 — Admin panel

_To be completed._

---

## Phase 7 — Testing and polish

_To be completed._

---

## Feature 6 — Job-Tailored CV Rewrite

The algorithm is written up in `docs/algorithms.md` section 3, and the
decisions behind the feature — including where the build departed from its
spec — in `docs/job-tailored-rewrite.md`. These are the module notes.

### `server/src/algorithms/phraseRewriter.js`

Sentence-level rewriting. Pure: a string in, a string out.

| Function                | Does                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| `gerundToBase(word)`    | `"managing"` to `"manage"`, consulting `data/actionVerbs.js`               |
| `toPastTense(base)`     | `"manage"` to `"managed"`, with a small table of irregulars                |
| `tidy(text)`            | Collapses whitespace and capitalises                                       |
| `rewriteAsAction(line)` | Promotes the user's own verb out of a weak opener, or refuses and says why |
| `rewriteDescription()`  | The same over a multi-line field, preserving line breaks and bullets       |

The refusal is the important behaviour. `rewriteAsAction` returns the line
unchanged with a `reason` whenever the verb would have to come from anywhere
other than the user's own sentence, and the caller shows that reason as
advice. A rewriter that always produces something is easy to write and
dangerous to use.

### `server/src/algorithms/cvTailor.js`

The rewrite itself. Also pure — a CV and some advert text in, a draft out.
No database, no network, which is what lets it be unit-tested without Mongo
and explained on its own.

| Function               | Does                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `buildJobProfile()`    | Weights the advert and keeps its top 60 terms as the yardstick |
| `relevanceOf(text)`    | The share of that vocabulary a piece of CV text covers         |
| `buildVocabularyMap()` | The alias swaps this advert justifies (`js` to `JavaScript`)   |
| `alignVocabulary()`    | Applies them, with boundaries that survive `Node.js` and `c++` |
| `tailorSkills()`       | The three-way split: promoted, added, suggested                |
| `buildSummary()`       | Five sentences, each from a named source on the CV             |
| `yearsOfExperience()`  | The span from earliest start to latest end, never the sum      |
| `tailorCV()`           | Orchestrates the seven steps and records every change          |

`tailorCV` returns `{ draft, changes, suggestedSkills, notes }`. `changes` is
what the review screen lists, each with a `before`, an `after` and a `reason`;
`notes` is the advice the module could not act on itself.

It reads `skillsFromSection` from `jobMatcher.js` and `hasQuantifiedResult`
from `cvStrengthScorer.js` rather than reimplementing either, so "what counts
as a listed skill" and "what counts as quantified" have one definition each
across all three algorithms.

### `server/src/controllers/cvTailor.controller.js`

Two handlers, and the split between them is the point of the feature.

- `previewTailoredCV` — `POST /api/cvs/:id/tailor`. Checks ownership, loads
  the corpus, runs the rewrite, and runs `analyseMatch` over both the original
  and the draft so the response can show before and after. **Stores nothing.**
- `saveTailoredCV` — `POST /api/cvs/:id/tailor/save`. Creates a new CV from
  the draft the user ended up with, starting from the source CV so anything
  the draft omits is carried over rather than lost. The rewrite is _not_
  re-run here: doing so would throw away the user's edits. It does re-run
  `analyseMatch` twice — once over the source CV and once over the draft being
  saved — and records both figures on the **new** CV. Measuring at save time
  rather than reusing the preview's numbers matters: the user spends the
  review step removing assumed skills and rewriting lines, so the preview's
  "after" describes a draft they did not keep. The advert is named again in
  the save body (`jobId`, or `jobDescription` when it was pasted) so that this
  measurement is possible; without it the CV is saved with no match figures
  rather than with wrong ones.

Both go through a local `findOwnedCV` that returns 404 rather than 403, as
everywhere else in the project. The preview shares `jobMatchLimiter` with the
analyses, because it is the most expensive request the server serves — one
weighting plus two full analyses. The save is not rate limited: a user who has
sat and edited a draft should never be told to wait before keeping it.

Naming: `buildTitle(userName, jobTitle)` offers `"<account name>-<advertised
role>"` — "Test Person-Backend Developer" — falling back to
`"<account name>-tailored"` when the advert had no title, and truncated to the
100 characters the model allows so a long role cannot fail validation after
the user has finished editing. It is built from the **account**, not the
source CV's title: a tailored CV is written to be sent to one employer, so the
person and the post are what identify it, whereas the source title is a
private working label ("My CV", "Copy of CV 2") that read as a variant of an
existing document rather than an application. The title is only ever offered —
the review step lets the user replace it, and a `title` in the save body wins.

Field whitelist: a saved draft may only set the same fields
`cv.controller.js` allows, so a user editing a draft cannot set the owner, the
primary flag or the score. The new CV is never primary, whatever the source
CV was — a CV written for one advert is the wrong default for every other
application.

### Model and logging

- `CV.tailoredFor` — `{ job, jobTitle, sourceCv, baselineMatchScore,
matchScore, tailoredAt }`, and `null` on every CV that was not produced this
  way. It defaults to `null` rather than to an empty object because "not
  tailored" and "tailored for nothing in particular" are different states, and
  the dashboard badge depends on telling them apart.
- The two scores live on the tailored CV and are **never written back to the
  source**. Tailoring produces a new document; it does not re-mark the one it
  was written from, so a user who tailors the same CV for five adverts sees
  its row in My CVs stay exactly as it was. `baselineMatchScore` is what the
  source scored against that advert and `matchScore` what the saved draft
  scored, so every screen draws the same "before → after" from one pair of
  numbers instead of each recomputing a figure of its own.
- `CV_TAILOR` added to `ACTIVITY_ACTIONS`, logged on save with the source CV
  and the job.

### Client

| File                             | Does                                                   |
| -------------------------------- | ------------------------------------------------------ |
| `api/tailor.js`                  | The three calls                                        |
| `pages/user/TailorCVPage.jsx`    | `/cvs/:id/tailor` — choose the advert, then review     |
| `components/cv/TailorReview.jsx` | The editable draft, the change list and the two scores |
| `pages/jobs/JobDetailPage.jsx`   | The same rewrite from an advert, then save-and-apply   |
| `components/jobs/JobCard.jsx`    | The board badge, one figure or the before → after pair |
| `pages/user/DashboardPage.jsx`   | The growth pill on a tailored CV's row in My CVs       |

### Where the growth is shown

Three places read the same stored pair, so none of them can disagree:

- **My CVs** — a `18% → 82%` pill on the row of any tailored CV.
- **The job board** — the same pair replaces the single "AI match (18%)"
  badge on an advert the user has already rewritten for. `scoreJobsForBoard`
  looks the tailored CVs up by `tailoredFor.job` and returns them alongside
  the live primary-CV scores, so the badges arrive in the one request the
  board already makes. A board row also no longer needs a primary CV to carry
  a badge: a tailored CV is enough.
- **The job page** — after the draft is saved the whole review panel collapses
  to a one-line summary carrying the pair, a link to the CV in My CVs and an
  "Apply with it" button. The same summary is rebuilt on a later visit from
  the `tailoredCv` that `GET /api/jobs/:id` now returns, so the result does
  not disappear when the tab is closed.

On the job page the leading action after a rewrite is **Save and apply with
it**: it saves the draft and opens the apply form already set to the new CV. A
rewrite that was never saved could not be sent to the employer anyway, and
asking for two presses to express one intention is a worse form.

The board's **Match** filter (`Any / Strong / Good / Fair / Weak / Already
tailored`) narrows the page on screen rather than the query. The scores are
produced by a second request, after the page of jobs has been chosen, so the
server could not filter by them without scoring every job in the database on
every search. The list says which page it is filtering so the user is not left
wondering why the pagination disagrees. Where a job has a tailored CV, that
CV's score is what the filter judges by — it is the best the user can
currently send.

Reached from a "Tailor for a job" action on each row of My CVs. The advert is
either chosen from the board or pasted in; most adverts a student applies to
are not on this board, so pasting is a first-class option rather than an
afterthought.

The review screen lists the changes **with their reasons before** it shows the
fields, rather than presenting a finished document to accept or reject. A user
who can see why their summary was replaced can judge whether to keep it; one
who only sees the new summary cannot. The before-and-after score is shown
honestly — if the rewrite did not help, that is what the user sees.

It is a two-column layout from `lg` upwards: the editable fields on the left,
a live A4 `CVPreview` of the draft sticky on the right. The preview is the
same component the builder uses, so what is on screen is geometrically the
PDF. Two reasons it belongs here rather than after saving. A rewrite is a
change to a document and a list of changed sentences is not a document — the
question a user is actually deciding is how the page reads, which previously
could only be answered by saving first. And the screen was one narrow column
of fields with the right-hand half of a desktop window empty, which reads as
though something had failed to load. Below `lg` the preview moves underneath,
since a phone is one column regardless. Both pages that host the review widen
to `max-w-6xl` while it is open and return to their normal width afterwards.

A `Carried over unchanged` block lists education, certifications, languages
and references read-only. They are facts rather than phrasing, so a rewrite
aimed at one advert has nothing to improve in them — but a review that shows
only the changed parts invites the reader to assume the rest was dropped, and
the whole CV is what is about to be saved. They stay read-only because editing
the facts of a degree belongs in the builder, which opens on the CV the moment
it is saved.

## Feature 7 — Account types and company approval

**Why:** job seekers and employers need different parts of the system, and an
employer's company must be checked before its jobs reach job seekers.

### Account type (`User.accountType`)

- `jobseeker` | `employer` | `null`. `null` until chosen; admins have none.
- `PATCH /api/users/me/account-type` (`user.controller.js → setAccountType`)
  sets it **once**; a second call is refused with 409.
- `requireAccountType(type)` (`middleware/role.js`) guards routes: company and
  job-posting routes need `employer`; save and apply need `jobseeker`. Admins
  always pass.

### Company approval (`Company` model)

- New fields: `registrationNumber`, `phone`, `email`, `documentFile` (private),
  `status` (`pending` | `approved` | `rejected`), `rejectionReason`,
  `reviewedAt`, `reviewedBy`, `submittedAt`.
- A new company is `pending`. Editing a `rejected` one, or replacing its
  document, sends it back to `pending`.
- An `approved` company is locked: `PUT /companies/mine` and the document
  upload return 403; only the logo can change.
- The registration document is stored in `server/private-uploads/company-docs`
  (git-ignored, **not** under the public `/uploads`) and is streamed only to the
  owner or an admin by `GET /api/companies/:id/document`; anyone else gets 404.
- `services/companyVisibility.js → visibleJobsFilter()` limits every public job
  query (board, job page, upload ranking, match scores) to approved companies.
  Posting a job and applying both check the company is approved.

### Admin review (`controllers/adminCompany.controller.js`)

- `listCompanies` — one status at a time (pending oldest first), search, and a
  count per status for the tabs.
- `reviewCompany` — approval needs a document on file; rejection needs a
  reason (≥ 5 characters) that the employer sees. Logged as `ADMIN_ACTION` with
  `COMPANY_APPROVE` / `COMPANY_REJECT`.

### Client

- `pages/user/WelcomePage.jsx` — the one-time choice; `ProtectedRoute` sends any
  account without a type there, and the layout hides the sidebar on it.
- `utils/homePath.js → homePathFor(user)` — admin → `/admin`, employer →
  `/company`, job seeker → `/dashboard`, no type → `/welcome`.
- `routes/AccountTypeRoute.jsx` — groups job-seeker and employer pages.
- Sidebar per type: job seeker (CVs, Match my CV, jobs, saved, applications);
  employer (company profile, my posts, browse jobs); admin (everything a job
  seeker sees plus Administration → Companies).
- `components/company/CompanyStatusBanner.jsx`, `pages/company/CompanyForm.jsx`
  (required fields + document), `pages/admin/AdminCompaniesPage.jsx`.

### Migration

`npm run migrate:accounts` (`scripts/migrateAccountTypes.js`): existing
companies → approved, their owners → employers, everyone else chooses on next
login. Idempotent.

## Feature 8 — Candidate directory

An approved employer can browse the people on the system, filter them by
industry, and read one person's profile together with the CV they have marked
as primary. Admins see the same screens, and can switch the directory over to
employer accounts.

### Who may read it

`middleware/talentAccess.js → requireApprovedEmployer` is the gate, and it is
deliberately the same condition that allows posting a job: an admin, or the
owner of a company the admin has approved. Candidate profiles are personal
data, so an unverified account must not be able to page through them. The
middleware leaves the company on `req.employerCompany` for any handler that
needs it, and its message says which of the three reasons applied (no company,
pending, rejected).

Two rules hold for every query in `controllers/talent.controller.js`:

1. Admin accounts are never listed and never readable here — an admin is not a
   candidate, and the directory is not a way to enumerate who runs the system.
2. An employer sees job seekers only. `?accountType=employer` is honoured for
   admins and forced back to `jobseeker` for everybody else, so the parameter
   cannot widen what an employer can see.

Blocked and soft-deleted accounts are left out of both the list and the detail
route.

### The profile

`User.jobSeekerProfile` (sub-document, no `_id`): `position`, `industry`,
`yearsExperience` (0–60), `openToWork`, `employmentTypes[]`, `location`,
`about`. It lives on the user rather than on a CV because it describes the
person, not a document: someone with five tailored CVs still has one current
position and one answer to "are you looking?".

`industry` and `employmentTypes` come from a fixed list
(`server/src/data/industries.js`, mirrored for the dropdowns in
`client/src/constants/industries.js`; the server validates). Free text would
give "IT", "I.T." and "Tech" as three industries no filter could reunite.

Index: `{ accountType, isDeleted, status, 'jobSeekerProfile.industry' }` — the
directory filters on exactly those fields.

### API

| Route | Who | Notes |
| ----- | --- | ----- |
| `GET /api/talent` | approved employer, admin | `page`, `search` (name or position), `industry`, `employmentType`, `openToWork`, `accountType` (admin only). Open-to-work candidates sort first. |
| `GET /api/talent/:id` | approved employer, admin | The person, plus `primaryCv` (`isPrimary: true`) or `null`. |
| `GET /api/talent/filters` | approved employer, admin | The industry and employment-type lists. |
| `PUT /api/users/me` | the owner | Now also takes `jobSeekerProfile`. `name` became optional, because the profile form posts only its own fields. Writing the profile is refused for an account that is not a job seeker. |

The primary CV is shown rather than the newest: a candidate may be part way
through a better draft, and showing a half-finished one would misrepresent
them. If none is marked, nothing is shown rather than a guess.

### Client

- `pages/talent/TalentPage.jsx` — filters and the card grid.
- `pages/talent/TalentDetailPage.jsx` — profile, open-to-work banner, and the
  primary CV through the same `CVPreview` the builder uses.
- `components/company/ApprovalNotice.jsx` — what an employer sees instead of
  any page their company is not approved for: the candidate directory and My
  posts both use it, so an employer who meets the wall twice reads one
  explanation rather than a full page in one place and a grey line in another.
  A page, not a red error bar: they have done nothing wrong, the admin simply
  has not checked them yet. The reason comes from the server where the server
  knows it, and from `utils/approvalMessage.js → approvalMessageFor(company)` — worded identically —
  where the client already has the status.
- `components/talent/OpenToWorkBadge.jsx`, `components/talent/Avatar.jsx`.
- `pages/user/ProfilePage.jsx` — the "Candidate profile" form, job seekers only.
- `pages/admin/AdminUsersPage.jsx` — account type and position columns, and a
  View button into the same detail page (not offered for admin rows).
- Sidebar: "Find candidates" for employers, "People directory" for admins. The
  employer link is shown even while unapproved, because the page explains the
  wait and a missing link explains nothing.
- `components/ui/Button.jsx` gained an optional `as` prop, so a link can carry
  the button styling instead of a `<button>` being nested inside an `<a>`.

### Role follows the account type

`User.role` is no longer just `user` or `admin`. Its enum is
`user | jobseeker | employer | admin`, and a `syncRole` pre-save hook sets it
from `accountType` for every non-admin, so the database says plainly what each
account is instead of leaving every row as `user`. Admins are never rewritten:
they have no account type, and losing the role would shut them out of the
panel.

Permissions are unchanged — `requireAdmin` and `requireAccountType` still
decide everything, so the role is a label rather than a second source of
truth. Code that used to mean "not an admin" by testing `role === 'user'` now
tests `role !== 'admin'`.

Writes that bypass Mongoose middleware set the role by hand: `updateOne` in
`seedQaDemo.js` and `seedLoadTestUsers.js`, the bulk insert in
`seedLoadTestUsers.js`, and step 3 of `npm run migrate:accounts`, which brings
an existing database into line.

## Feature 9 — Template catalogue

The admin can now decide which of the eleven templates users are offered,
and what each is called in the picker.

### Where a template lives

In two places, and the split is the point:

- **The markup is a React component** (`client/src/templates/`). It cannot be
  anywhere else — a template *is* its layout — and it must not be editable
  from a database field, or an admin could break every CV in the system with
  a typo.
- **The catalogue entry is a document** (`models/Template.js`): key, name,
  description, `isActive`, `sortOrder`, `usesPhoto`. "Deactivate this
  template" needs somewhere to be recorded, and that is here.

`key` joins the two, and is the same value a CV stores in `templateKey`. The
model constrains it to `TEMPLATE_KEYS`, so a catalogue row can never point at
a template with no component behind it.

### Two failure modes that are designed out

**An unseeded database.** `GET /api/templates` returns the whole catalogue
with `seeded: false` when the collection is empty, rather than an empty list.
An empty collection means "nobody has set this up", not "the admin withdrew
all eleven", and answering with nothing would leave the builder with no
template to choose — a worse failure than ignoring a setting nobody made.
The admin screen shows the same distinction and names the seed command.

**Switching off the last one.** `PATCH /admin/templates/:id` refuses to
deactivate the only active template. An admin unticking boxes one at a time
would otherwise produce a builder nobody can use, and find out when somebody
complained.

Deactivating never touches the CVs already using that template: the component
is still in the build and the CV still stores the key, so it keeps rendering
and exporting. The admin is withdrawing an option, not deleting work. The
picker also always shows the CV's current template even when it is no longer
offered, or the radio group would have nothing selected and look as though
the CV had lost its template.

### The seed

`npm run seed:templates` upserts from `src/data/templateCatalogue.js` and is
safe to re-run. Everything an admin can edit — name, description, sortOrder,
isActive — is written with `$setOnInsert`, so a reseed never undoes them. Only
`usesPhoto` is forced, because that is a fact about the component rather than
a setting. The cost is deliberate: a reworded description in the catalogue
does not reach a database that already has the row, and is changed on the
admin screen instead.

### Client

- `api/templates.js`, `pages/admin/AdminTemplatesPage.jsx` (activate,
  deactivate, rename inline), sidebar entry under Administration.
- `components/cv/CustomisePanel.jsx` filters the picker by the active keys.
  If that request fails it shows all of them: a network blip must not leave
  somebody unable to change their template, and the list only decides what is
  displayed — nothing is enforced client-side that matters.

### Tests

`tests/integration/templates.test.js` — ten cases covering the unseeded
fallback, public readability, hiding deactivated templates, admin ordering,
the 403 for an ordinary user, rename, the last-active guard, invalid versus
unknown ids, and that a CV using a deactivated template still loads.

## Feature 10 — Directory privacy, and honest keyword advice

### What an employer can read, and what is recorded

- **The list no longer carries email addresses.** A directory page is twenty
  contact addresses in one response, which is the shape somebody scrapes. The
  detail page still shows one, read by an employer who opened that person
  deliberately — and that view is logged.
- **`TALENT_VIEW`** is a new activity action, written when an employer opens
  `GET /api/talent/:id`. It answers "who has looked at whom", and makes an
  employer paging through every candidate visible to the admin. It uses the
  `targetUser` meta key the admin log already resolves into a name, so the
  entry reads as a sentence with no change to the resolver. An admin's own
  browsing is **not** logged: it would bury the entries that matter.
- The admin user-detail page links through to the directory profile, so the
  admin can see a person exactly as an employer does.

### The keyword gap said "someone"

Before this change the most frequently missing keyword across the whole
system was _someone_ (98 occurrences), then _four_ (30) and _five_ (23). The
cause is not a bug in TF-IDF: on a small corpus a word used by one advert and
no other genuinely is distinctive. It is a reporting problem, and it is fixed
at reporting time — see `docs/algorithms.md` §2.2 for the reasoning. Two
changes:

1. `UNACTIONABLE_WORDS` gained number words, indefinite people and vague
   quantities.
2. Keyword entries carry `isSkill`, and the matched and missing lists are
   sorted with named skills first. Because both lists are truncated, the
   ordering is what decides which advice survives.

Scores are untouched by design: the vectors, the similarity and the match
score are all computed before either rule runs. A unit test asserts exactly
that, alongside one that the noise words never appear and one that no generic
term outranks a skill.

## Feature 11 — Template gallery

Templates are chosen from a grid of live thumbnails instead of a list of names, on a
**Templates** page (`/templates`, to start a new CV) and in the editor's Design tab (to
switch the current one).

### Pieces

| File                                                        | Responsibility                                                                                |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `client/src/templates/index.js`                             | Registry; each template now has a `category` and `isTwoColumn`. `CATEGORIES` lists the chips. |
| `client/src/templates/sampleCV.js`                          | `SAMPLE_CV`, an invented CV with every section filled; `sampleFor(key, settings)`.            |
| `client/src/components/templates/TemplateThumbnail.jsx`     | The real template at A4 size, shrunk with `transform: scale()`; drawn only near the viewport. |
| `client/src/components/templates/TemplateGallery.jsx`       | Search, category chips, photo / two-column / "my CV" toggles, and the grid.                   |
| `client/src/components/templates/TemplatePreviewDialog.jsx` | Native `<dialog>` with a large preview and "Use this template".                               |
| `client/src/components/templates/useOfferedTemplates.js`    | The registry filtered to what the admin has left active (shared by both screens).             |
| `client/src/pages/user/TemplatesPage.jsx`                   | The gallery page; "Use this template" creates a CV in it and opens the editor.                |

### Decisions

- **Thumbnails are renders, not images.** The same component draws the thumbnail, the
  editor preview and the PDF, so a thumbnail cannot go out of date.
- **A sample CV, not the user's.** A half-written CV would make every template look empty.
  In the editor the sample borrows the CV's colours and fonts, and "Preview with my CV"
  switches to the real content.
- **What a click does belongs to the caller.** The page opens a preview dialog first; the
  Design tab applies the template at once, because the editor's live preview is already
  the large view.
- **Lazy drawing.** Each thumbnail waits for an `IntersectionObserver` before laying out a
  whole CV, so a long gallery does not lay out every template on load.
- **Heading font.** `settings.headingFont` (empty means the same as the body) drives the
  `--cv-heading-font` variable used by `.cv-name` and `.cv-section-title`; the ATS
  template keeps Arial throughout.

The plan for growing the catalogue to 50+ templates with a template engine is in
`docs/plans/template-gallery/PLAN.md`.
