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
`server/tests/unit/cvTailor.test.js` (32 cases, with its page-fill block
listed separately in 1.2). The table lists the ones that
pin down a decision; the rest are ordinary coverage of the same functions.

| Test ID | Module            | Description                               | Input / Steps                                                                             | Expected Result                                                              | Actual Result | Status |
| ------- | ----------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------- | ------ |
| U-TR-01 | phraseRewriter    | Promotes the user's own verb              | `rewriteAsAction("Responsible for managing the release process")`                         | `"Managed the release process"`                                              | As expected   | Pass   |
| U-TR-02 | phraseRewriter    | Present tense for a current role          | The same line with `{ present: true }`                                                    | `"Manage the release process"`                                               | As expected   | Pass   |
| U-TR-03 | phraseRewriter    | Refuses to invent a verb                  | `rewriteAsAction("Responsible for the stock room")`                                       | Unchanged, `changed: false`, a reason for the user                           | As expected   | Pass   |
| U-TR-04 | phraseRewriter    | Irregular gerund via the action-verb list | `gerundToBase("writing")`                                                                 | `"write"`                                                                    | As expected   | Pass   |
| U-TR-05 | phraseRewriter    | Does not over-apply the silent e          | `gerundToBase("editing")`, `gerundToBase("sitting")`                                      | `"edit"`, `"sit"` — never `"edite"` or `"site"`                              | As expected   | Pass   |
| U-TR-06 | phraseRewriter    | Keeps a bullet character                  | `rewriteDescription("- Responsible for managing the rota")`                               | `"- Managed the rota"`                                                       | As expected   | Pass   |
| U-TR-07 | phraseRewriter    | Removes a leading pronoun                 | `removeFiller("I developed the billing API")`                                             | `"Developed the billing API"`                                                | As expected   | Pass   |
| U-TR-08 | phraseRewriter    | Keeps "I" that is not a pronoun           | `removeFiller("I/O testing for the firmware")`                                            | Unchanged                                                                    | As expected   | Pass   |
| U-TR-09 | phraseRewriter    | "was able to" and filler, number kept     | `removeFiller("Was able to reduce costs by 20% by utilizing caching")`                    | `"Reduced costs by 20% by using caching"`                                    | As expected   | Pass   |
| U-TR-10 | phraseRewriter    | Past tense for a finished role            | `normaliseTense("Performing automation testing")`, `("Leads the QA team")`                | `"Performed automation testing"`, `"Led the QA team"`                        | As expected   | Pass   |
| U-TR-11 | phraseRewriter    | Present tense for a current role          | `normaliseTense("Performing automation testing", { present: true })`                      | `"Perform automation testing"`                                               | As expected   | Pass   |
| U-TR-12 | phraseRewriter    | Leaves a noun phrase alone                | `normaliseTense("Testing of payment flows")`                                              | `changed: false`                                                             | As expected   | Pass   |
| U-TR-13 | phraseRewriter    | All three steps together                  | `polishSentence("I successfully conducted API testing")`                                  | `"Conducted API testing"`                                                    | As expected   | Pass   |
| U-TR-14 | phraseRewriter    | Splits sentences, not version numbers     | `splitSentences("Built X. Tested Y. Used v2.1 tools.")`                                   | Three sentences, `v2.1` intact                                               | As expected   | Pass   |
| U-TC-16 | cvTailor          | Gaps between jobs are not counted         | Roles 2015-01→2017-01 and 2020-01→2021-01                                                 | `yearsOfExperience` = 3                                                      | As expected   | Pass   |
| U-TC-17 | cvTailor          | Seniority guard on the headline           | `softenTitle("Senior QA Engineer")` for a CV with no senior role                          | `"QA Engineer"`, removed `["Senior"]`                                        | As expected   | Pass   |
| U-TC-18 | cvTailor          | Keeps seniority the CV supports           | Same title for a CV with "Senior Tester"                                                  | `"Senior QA Engineer"`                                                       | As expected   | Pass   |
| U-TC-19 | cvTailor          | Rewords weak bullets, facts unchanged     | A role with "Performing…", "I wrote 300…", "Was able to reduce… 30%"                      | Past-tense, pronoun-free lines; 300 and 30% unchanged; headline not "Senior" | As expected   | Pass   |
| U-WD-01 | wordDiff (client) | Marks removed and added words             | `wordDiff("Responsible for managing the release process", "Managed the release process")` | removed / added / same runs                                                  | As expected   | Pass   |
| U-WD-02 | wordDiff (client) | Ignores case and punctuation              | `wordDiff("Built the API.", "built the API")`                                             | All runs "same"                                                              | As expected   | Pass   |
| U-TC-01 | cvTailor          | Relevance follows the advert              | On-topic vs off-topic text against a backend advert                                       | On-topic scores higher                                                       | As expected   | Pass   |
| U-TC-02 | cvTailor          | Keyword stuffing earns nothing            | `"Docker"` vs `"Docker"` eight times                                                      | Identical relevance                                                          | As expected   | Pass   |
| U-TC-03 | cvTailor          | Overlapping roles are not double-counted  | Two overlapping three-year roles                                                          | 3 years, not 6                                                               | As expected   | Pass   |
| U-TC-04 | cvTailor          | Three-way skill split                     | Advert wants Node.js, Express, Docker, MongoDB, AWS                                       | Promoted / added / suggested as in algorithms.md 3.5                         | As expected   | Pass   |
| U-TC-05 | cvTailor          | Never adds an unevidenced skill           | The same inputs                                                                           | MongoDB and AWS absent from the draft's skills                               | As expected   | Pass   |
| U-TC-06 | cvTailor          | Alias swap to the advert's spelling       | CV says "JS", advert says "JavaScript"                                                    | Draft says "JavaScript"                                                      | As expected   | Pass   |
| U-TC-07 | cvTailor          | No swap inside a dotted skill name        | `"Built REST APIs in Node.js and Vue.js"`                                                 | Unchanged — not `"Node.js.js"` or `"Vue.JavaScript"`                         | As expected   | Pass   |
| U-TC-08 | cvTailor          | No swap into a phrase                     | `"Cut API response time by 40%"`                                                          | Unchanged — "api" is not expanded to "REST API"                              | As expected   | Pass   |
| U-TC-09 | cvTailor          | Roles keep their chronology               | A backend role and a shop role                                                            | Order unchanged                                                              | As expected   | Pass   |
| U-TC-10 | cvTailor          | Projects are re-ordered by relevance      | A PHP blog and an Express/Docker gateway                                                  | The gateway comes first                                                      | As expected   | Pass   |
| U-TC-11 | cvTailor          | Quantified achievement wins a tie         | Two achievements the advert cannot separate                                               | The one with "40%" first                                                     | As expected   | Pass   |
| U-TC-12 | cvTailor          | Advises rather than inventing a figure    | A role with nothing quantified                                                            | A note saying "Add a number"; no digit added to the text                     | As expected   | Pass   |
| U-TC-13 | cvTailor          | Every change carries a reason             | Any tailored CV                                                                           | Each change has a section, a kind and a reason                               | As expected   | Pass   |
| U-TC-14 | cvTailor          | The source CV is not modified             | Tailor a CV, compare it before and after                                                  | Byte-identical                                                               | As expected   | Pass   |
| U-TC-15 | cvTailor          | Copes with an empty CV                    | `tailorCV({}, advert)`                                                                    | Empty sections, no exception                                                 | As expected   | Pass   |

---

### 1.2 Page fill

`server/tests/unit/pageFill.test.js` (10 cases) and the `filling the page`
block of `server/tests/unit/cvTailor.test.js` (7 cases).

| Test ID | Module   | Description                                  | Input / Steps                                              | Expected Result                                                    | Actual Result | Status |
| ------- | -------- | -------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ | ------------- | ------ |
| U-PF-01 | pageFill | An A4 page holds a plausible number of lines | `pageCapacity({ fontSize: 'medium' })`                     | Between 40 and 55                                                  | As expected   | Pass   |
| U-PF-02 | pageFill | Larger type fits fewer lines                 | `large` vs `small`                                         | `large` capacity is lower                                          | As expected   | Pass   |
| U-PF-03 | pageFill | A thin CV reads as thin                      | One role, one qualification, three skills                  | Under 70% of a page, not full                                      | As expected   | Pass   |
| U-PF-04 | pageFill | A CV with real content reads as full         | Three roles with three achievements each, plus a project   | `isFull` true, shortfall 0                                         | As expected   | Pass   |
| U-PF-05 | pageFill | A sidebar is not counted as stacked content  | The same CV as `classic` and as `modern`                   | The two-column estimate is lower                                   | As expected   | Pass   |
| U-PF-06 | pageFill | A hidden section does not fill the page      | `hiddenSections: ['experience']`                           | Fewer lines; that section measures 0                               | As expected   | Pass   |
| U-PF-07 | pageFill | Survives an empty CV                         | `estimateFill({})`                                         | A finite ratio, not full, no exception                             | As expected   | Pass   |
| U-TF-01 | cvTailor | The rewrite reports how full the page is     | Tailor a one-role CV                                       | `pageFill` carries ratio, capacity and `isFull`                    | As expected   | Pass   |
| U-TF-02 | cvTailor | It never ends emptier than it started        | The same                                                   | `ratio >= startRatio`                                              | As expected   | Pass   |
| U-TF-03 | cvTailor | Type is set larger rather than leaving a gap | A thin CV against a long advert                            | `fontSize` is `large`, with a recorded reason                      | As expected   | Pass   |
| U-TF-04 | cvTailor | The longer summary invents nothing           | The same                                                   | Summary names the CV's own qualification and its own "120%" figure | As expected   | Pass   |
| U-TF-05 | cvTailor | It refuses, then helps                       | A shop CV against a backend advert                         | A note with the percentage and "will not invent experience"        | As expected   | Pass   |
| U-TF-06 | cvTailor | A hidden section with content is shown again | `hiddenSections: ['education']` on a CV that has education | Removed from `hiddenSections`, recorded as a change                | As expected   | Pass   |
| U-TF-07 | cvTailor | A full page is left alone                    | A CV with four roles                                       | `isFull` true and the font size is not raised                      | As expected   | Pass   |

---

### 1.3 Template gallery

`client/src/templates/templates.test.jsx` (registry, heading font and sample CV cases) and
`client/src/components/templates/TemplateGallery.test.jsx` (8 cases).

| Test ID | Module          | Description                                | Input / Steps                                                     | Expected Result                                          | Actual Result | Status |
| ------- | --------------- | ------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------- | ------------- | ------ |
| U-TG-01 | Registry        | Every template has a known category        | Each entry in `TEMPLATES`                                         | `category` is one of `CATEGORIES`; `isTwoColumn` boolean | As expected   | Pass   |
| U-TG-02 | Registry        | Client and server lists agree              | Keys of `TEMPLATES` vs `TEMPLATE_CATALOGUE`                       | Identical, in the same order                             | As expected   | Pass   |
| U-TG-03 | templateUtils   | Heading font falls back to the body font   | `buildTemplateVariables({ fontFamily: 'Lora', headingFont: '' })` | `--cv-heading-font` is the Lora stack                    | As expected   | Pass   |
| U-TG-04 | templateUtils   | Heading font can differ from the body      | `fontFamily: 'Inter', headingFont: 'Oswald'`                      | Heading Oswald, body Inter                               | As expected   | Pass   |
| U-TG-05 | sampleCV        | Sample fills every section                 | `visibleSections(SAMPLE_CV)`                                      | All eight sections                                       | As expected   | Pass   |
| U-TG-06 | sampleCV        | Borrows styling, never hidden sections     | `sampleFor('modern', { primaryColor, hiddenSections: [...] })`    | Colour carried over; skills and projects still visible   | As expected   | Pass   |
| U-TG-07 | TemplateGallery | One card per template                      | Render with all templates                                         | 11 cards                                                 | As expected   | Pass   |
| U-TG-08 | TemplateGallery | Marks the current template                 | `selectedKey="modern"`                                            | "Modern template (current)", `aria-pressed="true"`       | As expected   | Pass   |
| U-TG-09 | TemplateGallery | Click hands the template to the caller     | Click the Executive card                                          | `onChoose` called with `key: 'executive'`                | As expected   | Pass   |
| U-TG-10 | TemplateGallery | Category filter                            | Click "ATS-friendly"                                              | Only the ATS-Friendly card                               | As expected   | Pass   |
| U-TG-11 | TemplateGallery | Search covers descriptions                 | Type "sidebar"                                                    | Modern shown, Classic hidden                             | As expected   | Pass   |
| U-TG-12 | TemplateGallery | Photo filter                               | Tick "With photo"                                                 | Only templates with `usesPhoto`                          | As expected   | Pass   |
| U-TG-13 | TemplateGallery | Empty state with a way out                 | Search for nothing that exists, then "Clear filters"              | Message shown; then all 11 cards back                    | As expected   | Pass   |
| U-TG-14 | TemplateGallery | "Preview with my CV" needs a CV            | Render without, then with `userCV`                                | Toggle absent, then present                              | As expected   | Pass   |
| U-TG-15 | sampleCV        | A different person in every template       | `sampleFor` for every registered template                         | 40 distinct names and 40 distinct headlines              | As expected   | Pass   |
| U-TG-16 | sampleCV        | Every sample is full, with a drawn photo   | `sampleFor` for every template                                    | Photo is an SVG data URL; every section has content      | As expected   | Pass   |
| U-TG-17 | sampleCV        | Thumbnails wear the template's own palette | `sampleFor('rosewood', { fontSize: 'large', … })`                 | Rosewood's primary colour; the CV's font size kept       | As expected   | Pass   |

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

| Test ID | Module         | Description                                          | Input / Steps                                                     | Expected Result                             | Actual Result | Status |
| ------- | -------------- | ---------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------- | ------------- | ------ |
| ST-040  | Routing        | Landing page renders for a visitor                   | Render at `/` with no session                                     | The hero heading is shown                   | As expected   | Pass   |
| ST-041  | Routing        | Landing page offers registration                     | Render at `/` with no session                                     | A link pointing at `/register` is present   | As expected   | Pass   |
| ST-042  | Routing        | Login page renders                                   | Render at `/login`                                                | The "Log in" heading is shown               | As expected   | Pass   |
| ST-043  | Guard          | Guarded route redirects a visitor                    | Render at `/dashboard` with no session                            | The login page is shown instead             | As expected   | Pass   |
| ST-044  | Routing        | Unknown route shows a not-found page                 | Render at `/no-such-page`                                         | The "Page not found" heading is shown       | As expected   | Pass   |
| ST-045  | Guard          | Guarded route renders for a logged-in user           | Render at `/dashboard` with a mocked session                      | The "My CVs" heading is shown               | As expected   | Pass   |
| ST-046  | Navigation     | Navigation reflects the logged-in state              | Render at `/` with a mocked session                               | A "Log out" button is present               | As expected   | Pass   |
| ST-047  | Google sign-in | First Google sign-in creates an account              | `POST /api/auth/google` with a token Google verifies (mocked)     | 200, `isNew: true`, no password, cookie set | As expected   | Pass   |
| ST-048  | Google sign-in | Same email links to the existing account             | Register, then sign in with Google for that email                 | Same account, `googleId` stored             | As expected   | Pass   |
| ST-049  | Google sign-in | Unverified email, blocked user and admin are refused | Sign in with each                                                 | 401, 403, 403                               | As expected   | Pass   |
| ST-050  | Google sign-in | Google-only account sets its first password          | `PUT /api/users/me/password` with only `newPassword`, then log in | 200, then password login works              | As expected   | Pass   |
| ST-051  | Confirm modal  | Delete asks in a centred modal                       | Click a confirm, then Confirm / Cancel                            | Resolves true / false; modal closes         | As expected   | Pass   |

---

### 2.6 Job-Tailored CV Rewrite

`server/tests/integration/cvTailor.test.js` (14 cases).

| Test ID | Module       | Description                            | Input / Steps                                        | Expected Result                                                                                                           | Actual Result | Status |
| ------- | ------------ | -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| S-TR-01 | Tailor API   | Rejects an anonymous caller            | `POST /api/cvs/:id/tailor` with no session           | 401                                                                                                                       | As expected   | Pass   |
| S-TR-02 | Tailor API   | Another user's CV is not reachable     | Sign in as a second user, tailor the first user's CV | 404, not 403 — 403 would confirm the id is real                                                                           | As expected   | Pass   |
| S-TR-03 | Tailor API   | Validates the advert                   | `jobDescription: "Dev wanted"`                       | 400                                                                                                                       | As expected   | Pass   |
| S-TR-04 | Tailor API   | Returns draft, changes and comparison  | A filled CV and a pasted advert                      | 200 with `draft`, `changes`, `comparison`, `suggestedTitle`                                                               | As expected   | Pass   |
| S-TR-05 | Tailor API   | The preview stores nothing             | Run a preview, then count CVs                        | Still one CV                                                                                                              | As expected   | Pass   |
| S-TR-06 | Tailor API   | Accepts a job from the board           | `{ jobId }` for an open job                          | 200, headline set to that job's title                                                                                     | As expected   | Pass   |
| S-TR-07 | Tailor save  | Creates a new CV, original untouched   | Preview, then `POST /api/cvs/:id/tailor/save`        | 201, two CVs, the original's headline and summary unchanged                                                               | As expected   | Pass   |
| S-TR-08 | Tailor save  | Stores the user's edits, not the draft | Edit the summary before saving                       | The saved CV has the edited summary                                                                                       | As expected   | Pass   |
| S-TR-09 | Tailor save  | The tailored CV is never primary       | Tailor from a primary CV                             | New CV `isPrimary: false`; the original keeps the flag                                                                    | As expected   | Pass   |
| S-TR-10 | Tailor save  | Refuses a body with no draft           | `POST .../tailor/save` with only a title             | 400                                                                                                                       | As expected   | Pass   |
| S-TR-11 | Activity log | The save is recorded                   | Save a tailored CV, read the log                     | A `CV_TAILOR` entry with the job title in `meta`                                                                          | As expected   | Pass   |
| S-TR-12 | Tailor save  | Match figures land on the new CV only  | Save a tailored draft, then reload the source CV     | New CV has `baselineMatchScore` < `matchScore`; the source's `tailoredFor` is still null and its strength score unchanged | As expected   | Pass   |
| S-TR-13 | Tailor save  | The saved draft is what gets scored    | Strip the summary and skills out before saving       | Stored `matchScore` is below the figure the preview promised                                                              | As expected   | Pass   |
| S-TR-14 | Tailor save  | No advert means no score, not a guess  | Save with no `jobId` and no `jobDescription`         | Both figures null                                                                                                         | As expected   | Pass   |
| S-TR-15 | Tailor API   | Offers a title from the name and role  | Preview with jobTitle “Backend Developer”            | `suggestedTitle` is `Test Person-Backend Developer`, not the source CV title                                              | As expected   | Pass   |
| S-TR-16 | Tailor save  | Keeps the offered title when untouched | Save with no `title` in the body                     | The saved CV is named `Test Person-Backend Developer`                                                                     | As expected   | Pass   |
| S-TR-17 | Tailor save  | The user can still name it themselves  | Save with `title: “For Acme, final”`                 | The saved CV keeps the typed title                                                                                        | As expected   | Pass   |

---

### 2.7 Match badges on the job board

`server/tests/integration/jobMatch.test.js`, `POST /api/job-match/scores`
(8 cases). The three below cover the before-and-after badge.

| Test ID | Module    | Description                                    | Input / Steps                                        | Expected Result                                                        | Actual Result | Status |
| ------- | --------- | ---------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- | ------------- | ------ |
| S-MB-01 | Board API | Reports a CV already tailored for a job        | Tailor and save a CV for a job, then score the board | That job's row carries `tailored` with both figures and the CV's title | As expected   | Pass   |
| S-MB-02 | Board API | A tailored CV shows without a primary CV       | The same, with no CV starred                         | `cv` is null, `matchScore` is null, `tailored` is still returned       | As expected   | Pass   |
| S-MB-03 | Board API | No tailored CV is reported where there is none | Score a job the user has not rewritten for           | `tailored` is null                                                     | As expected   | Pass   |

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

### 2.8 Account types and company approval

`server/tests/integration/accountsAndCompanies.test.js` (19 cases).

| Test ID | Module       | Description                                | Input / Steps                                    | Expected Result                                | Actual Result | Status |
| ------- | ------------ | ------------------------------------------ | ------------------------------------------------ | ---------------------------------------------- | ------------- | ------ |
| S-AC-01 | Account type | Starts unset                               | Register, `GET /api/auth/me`                     | `accountType: null`                            | As expected   | Pass   |
| S-AC-02 | Account type | Chosen once, never changed                 | `PATCH /users/me/account-type` twice             | 200, then 409                                  | As expected   | Pass   |
| S-AC-03 | Account type | Rejects an unknown type                    | `accountType: "admin"`                           | 400                                            | As expected   | Pass   |
| S-AC-04 | Permissions  | Job seeker cannot create a company         | Job seeker `POST /api/companies`                 | 403                                            | As expected   | Pass   |
| S-AC-05 | Company      | Verification details are required          | Employer posts only a name                       | 400                                            | As expected   | Pass   |
| S-AC-06 | Permissions  | Employer cannot save a job                 | Employer `POST /api/jobs/:id/save`               | 403                                            | As expected   | Pass   |
| S-AC-07 | Company      | Starts pending and cannot post             | Create company + document, post a job            | `status: pending`; job post 403                | As expected   | Pass   |
| S-AC-08 | Visibility   | Pending company's jobs are hidden          | Job of a pending company on board / job page     | Board empty, page 404; owner still sees it     | As expected   | Pass   |
| S-AC-09 | Admin review | Lists pending with counts                  | `GET /api/admin/companies?status=pending`        | 1 company, counts, `hasDocument`, no file name | As expected   | Pass   |
| S-AC-10 | Admin review | Approval lets the company post             | Approve, then post a job                         | 200, then 201                                  | As expected   | Pass   |
| S-AC-11 | Admin review | No approval without a document             | Approve a company with no document               | 400                                            | As expected   | Pass   |
| S-AC-12 | Admin review | Rejection needs a reason the employer sees | Reject without, then with a reason               | 400; then `rejected` with the reason           | As expected   | Pass   |
| S-AC-13 | Company      | Editing a rejected company resubmits it    | `PUT /companies/mine` on a rejected company      | `status: pending`, reason cleared              | As expected   | Pass   |
| S-AC-14 | Admin review | Admin only                                 | Job seeker `GET /api/admin/companies`            | 403                                            | As expected   | Pass   |
| S-AC-15 | Company      | Approved details are locked                | `PUT /companies/mine` on an approved company     | 403, name unchanged                            | As expected   | Pass   |
| S-AC-16 | Company      | Approved document cannot be replaced       | Upload a document to an approved company         | 403                                            | As expected   | Pass   |
| S-AC-17 | Company      | Pending company can still be edited        | `PUT /companies/mine` while pending              | 200, new name                                  | As expected   | Pass   |
| S-AC-18 | Document     | Private to owner and admin                 | Owner, admin, another employer read the document | 200, 200, 404                                  | As expected   | Pass   |
| S-AC-19 | Document     | Only PDF / JPG / PNG                       | Upload a `.txt` file                             | 400                                            | As expected   | Pass   |

### 1.4 Toast messages

`client/src/components/ui/Toast.test.jsx` (6 cases). The toasts are driven
through `useToast`, as the application drives them, rather than by rendering
the component with made-up props.

| Test ID | Module | Description                                 | Input/Steps                                               | Expected Result                          | Actual Result | Status |
| ------- | ------ | ------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- | ------------- | ------ |
| U-TO-01 | Toast  | A success is announced as a status          | `toast.success('Your profile has been updated')`          | One `role="status"` carrying the message | As expected   | Pass   |
| U-TO-02 | Toast  | A failure is announced at once              | `toast.error('That email address is already registered')` | One `role="alert"` carrying it           | As expected   | Pass   |
| U-TO-03 | Toast  | It can be crossed off before its time is up | Raise an error, click "Dismiss message"                   | No alert remains                         | As expected   | Pass   |
| U-TO-04 | Toast  | It hides itself                             | Raise a success, advance the clock 4.1 s                  | No status remains                        | As expected   | Pass   |
| U-TO-05 | Toast  | The same message is not stacked twice       | Raise the identical error twice                           | Exactly one alert                        | As expected   | Pass   |
| U-TO-06 | Toast  | An empty message is ignored                 | `toast.error('')`                                         | Nothing is shown                         | As expected   | Pass   |
