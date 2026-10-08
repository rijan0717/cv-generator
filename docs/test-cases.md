# Test Cases

Supports report section **4.2 Testing**.

Automated tests are written with Vitest. Server tests use Supertest against an
in-memory MongoDB instance, so they never touch the development database.
Client tests use React Testing Library.

Totals as of Phase 1: **24 server tests** and **7 client tests**, all passing.

---

## 1. Unit test cases

Unit tests live in `server/tests/unit/` and cover the algorithms in
`server/src/algorithms/`. They are written in Phase 5, when those algorithms
exist.

Rows for `cvStrengthScorer`, `jobMatcher` and `cvImportParser` are still to be
written up from the suites that already exist in `server/tests/unit/`.

### 1.1 Job-Tailored CV Rewrite

`server/tests/unit/phraseRewriter.test.js` (20 cases) and
`server/tests/unit/cvTailor.test.js` (25 cases). The table lists the ones that
pin down a decision; the rest are ordinary coverage of the same functions.

| Test ID | Module         | Description                               | Input / Steps                                                     | Expected Result                                          | Actual Result | Status |
| ------- | -------------- | ----------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- | ------------- | ------ |
| U-TR-01 | phraseRewriter | Promotes the user's own verb              | `rewriteAsAction("Responsible for managing the release process")` | `"Managed the release process"`                          | As expected   | Pass   |
| U-TR-02 | phraseRewriter | Present tense for a current role          | The same line with `{ present: true }`                            | `"Manage the release process"`                           | As expected   | Pass   |
| U-TR-03 | phraseRewriter | Refuses to invent a verb                  | `rewriteAsAction("Responsible for the stock room")`               | Unchanged, `changed: false`, a reason for the user       | As expected   | Pass   |
| U-TR-04 | phraseRewriter | Irregular gerund via the action-verb list | `gerundToBase("writing")`                                         | `"write"`                                                | As expected   | Pass   |
| U-TR-05 | phraseRewriter | Does not over-apply the silent e          | `gerundToBase("editing")`, `gerundToBase("sitting")`              | `"edit"`, `"sit"` — never `"edite"` or `"site"`          | As expected   | Pass   |
| U-TR-06 | phraseRewriter | Keeps a bullet character                  | `rewriteDescription("- Responsible for managing the rota")`       | `"- Managed the rota"`                                   | As expected   | Pass   |
| U-TC-01 | cvTailor       | Relevance follows the advert              | On-topic vs off-topic text against a backend advert               | On-topic scores higher                                   | As expected   | Pass   |
| U-TC-02 | cvTailor       | Keyword stuffing earns nothing            | `"Docker"` vs `"Docker"` eight times                              | Identical relevance                                      | As expected   | Pass   |
| U-TC-03 | cvTailor       | Overlapping roles are not double-counted  | Two overlapping three-year roles                                  | 3 years, not 6                                           | As expected   | Pass   |
| U-TC-04 | cvTailor       | Three-way skill split                     | Advert wants Node.js, Express, Docker, MongoDB, AWS               | Promoted / added / suggested as in algorithms.md 3.5     | As expected   | Pass   |
| U-TC-05 | cvTailor       | Never adds an unevidenced skill           | The same inputs                                                   | MongoDB and AWS absent from the draft's skills           | As expected   | Pass   |
| U-TC-06 | cvTailor       | Alias swap to the advert's spelling       | CV says "JS", advert says "JavaScript"                            | Draft says "JavaScript"                                  | As expected   | Pass   |
| U-TC-07 | cvTailor       | No swap inside a dotted skill name        | `"Built REST APIs in Node.js and Vue.js"`                         | Unchanged — not `"Node.js.js"` or `"Vue.JavaScript"`     | As expected   | Pass   |
| U-TC-08 | cvTailor       | No swap into a phrase                     | `"Cut API response time by 40%"`                                  | Unchanged — "api" is not expanded to "REST API"          | As expected   | Pass   |
| U-TC-09 | cvTailor       | Roles keep their chronology               | A backend role and a shop role                                    | Order unchanged                                          | As expected   | Pass   |
| U-TC-10 | cvTailor       | Projects are re-ordered by relevance      | A PHP blog and an Express/Docker gateway                          | The gateway comes first                                  | As expected   | Pass   |
| U-TC-11 | cvTailor       | Quantified achievement wins a tie         | Two achievements the advert cannot separate                       | The one with "40%" first                                 | As expected   | Pass   |
| U-TC-12 | cvTailor       | Advises rather than inventing a figure    | A role with nothing quantified                                    | A note saying "Add a number"; no digit added to the text | As expected   | Pass   |
| U-TC-13 | cvTailor       | Every change carries a reason             | Any tailored CV                                                   | Each change has a section, a kind and a reason           | As expected   | Pass   |
| U-TC-14 | cvTailor       | The source CV is not modified             | Tailor a CV, compare it before and after                          | Byte-identical                                           | As expected   | Pass   |
| U-TC-15 | cvTailor       | Copes with an empty CV                    | `tailorCV({}, advert)`                                            | Empty sections, no exception                             | As expected   | Pass   |

---

## 2. System test cases

### 2.1 Infrastructure

| Test ID | Module         | Description                                   | Input / Steps                          | Expected Result                                           | Actual Result                                   | Status |
| ------- | -------------- | --------------------------------------------- | -------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- | ------ |
| ST-001  | Infrastructure | Health check responds                         | Send `GET /api/health`                 | 200 with `success: true` and `data.status` equal to `ok`  | As expected, and `data.database` is `connected` | Pass   |
| ST-002  | Infrastructure | Unknown route is handled                      | Send `GET /api/does-not-exist`         | 404 with `success: false` and a "Route not found" message | As expected                                     | Pass   |
| ST-003  | Infrastructure | Client reaches the API through the Vite proxy | Request `GET /api/health` on port 5173 | Same payload as calling port 5000 directly                | As expected                                     | Pass   |

### 2.2 Registration

| Test ID | Module       | Description                         | Input / Steps                                        | Expected Result                                      | Actual Result | Status |
| ------- | ------------ | ----------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ------------- | ------ |
| ST-010  | Registration | Valid details create an account     | `POST /api/auth/register` with name, email, password | 201, user returned, httpOnly cookie set              | As expected   | Pass   |
| ST-011  | Registration | The password hash is never returned | Register, then search the whole response body        | No occurrence of `passwordHash` anywhere in the body | As expected   | Pass   |
| ST-012  | Registration | The password is stored hashed       | Register, then read the stored document              | Stored value differs from input and starts `$2`      | As expected   | Pass   |
| ST-013  | Registration | Duplicate email is rejected         | Register the same email twice                        | 409 with `success: false`                            | As expected   | Pass   |
| ST-014  | Registration | Password shorter than 8 is rejected | Register with password `pass1`                       | 400 with a length message                            | As expected   | Pass   |
| ST-015  | Registration | Password with no number is rejected | Register with password `passwordonly`                | 400 with a "must contain a number" message           | As expected   | Pass   |
| ST-016  | Registration | Password with no letter is rejected | Register with password `12345678`                    | 400 with a "must contain a letter" message           | As expected   | Pass   |
| ST-017  | Registration | Invalid email is rejected           | Register with email `not-an-email`                   | 400                                                  | As expected   | Pass   |
| ST-018  | Registration | Cannot self-register as admin       | Register with `role: "admin"` in the body            | 201 but the created role is `user`                   | As expected   | Pass   |

### 2.3 Login and session

| Test ID | Module  | Description                                            | Input / Steps                                       | Expected Result                         | Actual Result | Status |
| ------- | ------- | ------------------------------------------------------ | --------------------------------------------------- | --------------------------------------- | ------------- | ------ |
| ST-020  | Login   | Correct credentials log in                             | `POST /api/auth/login` with valid details           | 200, user returned, cookie set          | As expected   | Pass   |
| ST-021  | Login   | Wrong password is rejected                             | Login with an incorrect password                    | 401                                     | As expected   | Pass   |
| ST-022  | Login   | Unknown email and wrong password are indistinguishable | Compare both responses                              | Identical status and identical message  | As expected   | Pass   |
| ST-023  | Login   | Blocked account cannot log in                          | Set status to `blocked`, then log in                | 403 with a message containing "blocked" | As expected   | Pass   |
| ST-024  | Login   | Login time is recorded                                 | Log in, then read the stored document               | `lastLoginAt` is a date                 | As expected   | Pass   |
| ST-025  | Session | Anonymous request is rejected                          | `GET /api/auth/me` with no cookie                   | 401 with `success: false`               | As expected   | Pass   |
| ST-026  | Session | Valid cookie identifies the user                       | Register, then `GET /api/auth/me` on the same agent | 200 with the correct email              | As expected   | Pass   |
| ST-027  | Session | Logout ends the session                                | Register, logout, then `GET /api/auth/me`           | 401                                     | As expected   | Pass   |

### 2.4 Profile

| Test ID | Module   | Description                               | Input / Steps                                                  | Expected Result                                | Actual Result | Status |
| ------- | -------- | ----------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------- | ------------- | ------ |
| ST-030  | Profile  | Name can be updated                       | `PUT /api/users/me` with a new name                            | 200 and the new name is returned               | As expected   | Pass   |
| ST-031  | Profile  | Profile update requires a session         | `PUT /api/users/me` with no cookie                             | 401                                            | As expected   | Pass   |
| ST-032  | Password | Password change works end to end          | Change the password, then try the old and the new one at login | Old password gives 401, new password gives 200 | As expected   | Pass   |
| ST-033  | Password | Wrong current password is rejected        | Change the password supplying the wrong current one            | 400                                            | As expected   | Pass   |
| ST-034  | Password | New password must differ from the current | Change the password to the same value                          | 400                                            | As expected   | Pass   |

### 2.5 Client routing and guards

| Test ID | Module     | Description                                | Input / Steps                                | Expected Result                           | Actual Result | Status |
| ------- | ---------- | ------------------------------------------ | -------------------------------------------- | ----------------------------------------- | ------------- | ------ |
| ST-040  | Routing    | Landing page renders for a visitor         | Render at `/` with no session                | The hero heading is shown                 | As expected   | Pass   |
| ST-041  | Routing    | Landing page offers registration           | Render at `/` with no session                | A link pointing at `/register` is present | As expected   | Pass   |
| ST-042  | Routing    | Login page renders                         | Render at `/login`                           | The "Log in" heading is shown             | As expected   | Pass   |
| ST-043  | Guard      | Guarded route redirects a visitor          | Render at `/dashboard` with no session       | The login page is shown instead           | As expected   | Pass   |
| ST-044  | Routing    | Unknown route shows a not-found page       | Render at `/no-such-page`                    | The "Page not found" heading is shown     | As expected   | Pass   |
| ST-045  | Guard      | Guarded route renders for a logged-in user | Render at `/dashboard` with a mocked session | The "My CVs" heading is shown             | As expected   | Pass   |
| ST-046  | Navigation | Navigation reflects the logged-in state    | Render at `/` with a mocked session          | A "Log out" button is present             | As expected   | Pass   |

---

### 2.6 Job-Tailored CV Rewrite

`server/tests/integration/cvTailor.test.js` (11 cases).

| Test ID | Module       | Description                            | Input / Steps                                        | Expected Result                                             | Actual Result | Status |
| ------- | ------------ | -------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ------------- | ------ |
| S-TR-01 | Tailor API   | Rejects an anonymous caller            | `POST /api/cvs/:id/tailor` with no session           | 401                                                         | As expected   | Pass   |
| S-TR-02 | Tailor API   | Another user's CV is not reachable     | Sign in as a second user, tailor the first user's CV | 404, not 403 — 403 would confirm the id is real             | As expected   | Pass   |
| S-TR-03 | Tailor API   | Validates the advert                   | `jobDescription: "Dev wanted"`                       | 400                                                         | As expected   | Pass   |
| S-TR-04 | Tailor API   | Returns draft, changes and comparison  | A filled CV and a pasted advert                      | 200 with `draft`, `changes`, `comparison`, `suggestedTitle` | As expected   | Pass   |
| S-TR-05 | Tailor API   | The preview stores nothing             | Run a preview, then count CVs                        | Still one CV                                                | As expected   | Pass   |
| S-TR-06 | Tailor API   | Accepts a job from the board           | `{ jobId }` for an open job                          | 200, headline set to that job's title                       | As expected   | Pass   |
| S-TR-07 | Tailor save  | Creates a new CV, original untouched   | Preview, then `POST /api/cvs/:id/tailor/save`        | 201, two CVs, the original's headline and summary unchanged | As expected   | Pass   |
| S-TR-08 | Tailor save  | Stores the user's edits, not the draft | Edit the summary before saving                       | The saved CV has the edited summary                         | As expected   | Pass   |
| S-TR-09 | Tailor save  | The tailored CV is never primary       | Tailor from a primary CV                             | New CV `isPrimary: false`; the original keeps the flag      | As expected   | Pass   |
| S-TR-10 | Tailor save  | Refuses a body with no draft           | `POST .../tailor/save` with only a title             | 400                                                         | As expected   | Pass   |
| S-TR-11 | Activity log | The save is recorded                   | Save a tailored CV, read the log                     | A `CV_TAILOR` entry with the job title in `meta`            | As expected   | Pass   |

---

## 3. Manual test cases

These were carried out by hand against the running application, because they
involve the browser, the real database or an installed service.

| Test ID | Module     | Description                           | Input / Steps                                              | Expected Result                                   | Actual Result                                       | Status |
| ------- | ---------- | ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- | ------ |
| MT-001  | Database   | The application connects to MongoDB   | Start the server, open `/api/health`                       | `data.database` is `connected`                    | As expected                                         | Pass   |
| MT-002  | Seed       | The admin account can be created      | Run `npm run seed:admin`                                   | Admin account created and reported                | As expected                                         | Pass   |
| MT-003  | Seed       | Running the seed twice is safe        | Run `npm run seed:admin` a second time                     | Existing account updated, not duplicated          | As expected                                         | Pass   |
| MT-004  | Seed       | The example password is refused       | Set `ADMIN_PASSWORD` to the example value and run the seed | Script refuses and exits with an error            | Refused with "Refusing to use the example password" | Pass   |
| MT-005  | Auth       | The seeded admin can log in           | `POST /api/auth/login` with the seeded credentials         | 200 and the returned role is `admin`              | As expected                                         | Pass   |
| MT-006  | Auth       | A visitor can register in the browser | Complete the form at `/register`                           | Account created and the dashboard is shown        | As expected                                         | Pass   |
| MT-007  | Uploads    | An avatar image can be uploaded       | Upload a PNG under 2 MB to `/api/users/me/avatar`          | 200, `avatarUrl` set, file served from `/uploads` | As expected, file served with 200                   | Pass   |
| MT-008  | Uploads    | An oversized image is refused         | Upload a 3 MB image                                        | 400 with a clear size message, nothing stored     | "The image must be smaller than 2 MB"               | Pass   |
| MT-009  | Rate limit | Repeated failed logins are throttled  | Submit 11 wrong passwords within 15 minutes                | The 11th attempt is refused                       | Attempts 1–10 gave 401, attempt 11 gave 429         | Pass   |
| MT-010  | Uploads    | A non-image file is refused           | Upload a `.txt` file as an avatar                          | 400 with a file-type message                      | "Only JPG, PNG and WEBP images are allowed"         | Pass   |

---

## 4. How the tests are run

| Command               | Scope                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| `npm test`            | Every server and client test                                             |
| `npm run test:server` | Vitest and Supertest against the Express app, using an in-memory MongoDB |
| `npm run test:client` | Vitest and React Testing Library                                         |
