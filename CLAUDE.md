# CLAUDE.md — Smart CV Generator (TU BCA Project II, MERN Stack)

## 1. Project context

- Academic project for **Tribhuvan University, BCA 6th semester, Project II (CAPJ356)**. It is evaluated by a supervisor, an internal examiner and an external examiner, including a live demo and viva.
- Working title: **Smart CV Generator with ATS-Based CV–Job Matching**.
- The university guideline requires:
  - (a) database-backed CRUD operations
  - (b) reporting features
  - (c) at least one advanced feature based on an algorithm or statistical method (decision making / business intelligence)
  - (d) the student's own modules for core logic, not ready-made APIs or plugins
  - (e) unit and system test cases
  - (f) documentation that maps to the prescribed report chapters
- Every decision in this project must respect these rules.
- I (the developer) must be able to understand and explain every part of the code in the viva. Prefer clear, readable code over clever code.

## 2. Tech stack (MERN)

| Layer                     | Technology                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Frontend (`/client`)      | React (latest stable) + Vite, React Router, Tailwind CSS, Axios, Recharts (charts)                               |
| Backend (`/server`)       | Node.js (LTS) + Express, ES modules                                                                              |
| Database                  | MongoDB with Mongoose (local for development; MongoDB Atlas optional for deployment)                             |
| Auth                      | bcryptjs, jsonwebtoken, cookie-parser (JWT in an httpOnly cookie), google-auth-library (Google sign-in)          |
| Security / infrastructure | helmet, cors, express-rate-limit, express-validator, multer, dotenv, morgan                                      |
| Export                    | puppeteer (PDF), exceljs (Excel)                                                                                 |
| Testing                   | Vitest + Supertest + mongodb-memory-server (server); Vitest + React Testing Library (key client components only) |
| Tooling                   | ESLint + Prettier, nodemon, concurrently (root script runs client and server together), Git                      |

Do not add any other dependency without asking me first and explaining why.

## 3. Non-negotiable rules

1. **Own modules for core logic.** Everything in `server/src/algorithms/` must be written in plain JavaScript. Do NOT use NLP, ML or similarity libraries (e.g. natural, compromise, string-similarity, wink-nlp, TensorFlow.js). Libraries are allowed only for infrastructure: web server, database, auth, uploads, PDF rendering, Excel writing, charts and UI.
2. **No AI/LLM API integration for now.** It is a future phase. Keep a clean `services/` layer so it can be added later without restructuring.
3. **Work phase by phase** (section 9). At the end of each phase: stop, summarise what was built, list the files changed, explain how to run and test it, and wait for my approval before starting the next phase.
4. **Ask, don't guess.** If a requirement is unclear, ask me instead of inventing a feature.
5. **Explain for the viva.** Algorithm files need step-by-step comments. Every controller and service function needs a short JSDoc comment saying what it does.
6. **Security basics, always:** hash passwords; validate all input on the server; check ownership on every CV route; never return password hashes; never commit `.env` (commit `.env.example` instead).
7. **Git:** small commits with clear messages after each working feature (e.g. `feat(auth): add login endpoint`).
8. **Keep `/docs` in sync** (section 10) as features are completed.

## 4. User roles

| Role  | How the account is created                                                                           | Permissions                                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| User  | Self-registration                                                                                    | Manage own profile and own CVs only; use templates, customisation, strength scoring, job matching and downloads |
| Admin | Seed script only (`npm run seed:admin`, credentials read from `.env`). Never via public registration | Full admin panel: users, all CVs (view/delete), templates, reports, activity logs, BI dashboard                 |

## 5. Functional requirements

### 5.1 Authentication and profile

- Register (name, email, password), login, logout, get current user.
- "Continue with Google" on the login and register pages (shown only when `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` are set). A Google-only account can set a password later on the profile page.
- Password rules: minimum 8 characters, at least one letter and one number.
- Blocked users cannot log in and see a clear message.
- Profile: update name and avatar image; change password (requires current password).
- Rate-limit the login and register routes.

### 5.2 CV builder (user)

- A user can create multiple CVs (e.g. one per job type), each with its own title.
- Sections:
  - **Personal details:** full name, headline/job title, email, phone, address/city, website, LinkedIn, GitHub, photo
  - **Professional summary**
  - **Education** (repeatable): institution, degree, field of study, start date, end date, grade/GPA, description
  - **Experience** (repeatable): company, position, location, start date, end date or "currently working", description, achievements (list)
  - **Skills** (repeatable): name, level (Beginner / Intermediate / Advanced / Expert)
  - **Projects** (repeatable): name, role, description, technologies, link
  - **Certifications** (repeatable): name, issuer, date, credential link
  - **Languages** (repeatable): language, proficiency
  - **References** (repeatable, optional) or an "Available on request" toggle
- Multi-step form with a progress indicator; add, remove and reorder entries within each section.
- Autosave (debounced, about 1.5 seconds) plus a manual Save button; show "Saving…" / "Saved" status.
- Photo upload: JPG, PNG or WEBP only, maximum 2 MB, stored in `server/uploads/` (local disk, no third-party storage).
- Validation: end date must not be before start date; required fields per section; email and phone formats.
- **My CVs** dashboard: list showing CV title, template, last updated and strength score; actions: edit, duplicate, rename, delete (soft delete).

### 5.3 Templates and customisation

- Five templates as React components in `client/src/templates/`:
  1. **Classic** — single column, traditional serif styling
  2. **Modern** — two columns with a coloured sidebar and photo
  3. **Minimal** — generous whitespace, photo optional
  4. **Creative** — bold header band, icons for contact details
  5. **ATS-Friendly** — single column, no graphics or tables, plain headings
- All templates receive the same props (`cv`, `settings`) and read styling from CSS variables, so customisation works identically in every template.
- Customisation settings (saved per CV): primary colour, background colour, text colour, body font and heading font (curated list of 12 Google Fonts; the heading font defaults to the body font), font size (small / medium / large), theme preset (a few ready-made palettes plus light/dark), spacing (compact / normal), section visibility and section order.
- Live A4 preview (210 × 297 mm) that updates while the user edits, with correct page breaks for multi-page CVs.
- Users only see templates the admin has marked as active.
- Templates are chosen from a grid gallery of live thumbnails (sample CV, filter by category, photo and layout), on the `/templates` page and in the editor's Design tab. Plan for growing to 50+ templates: `docs/plans/template-gallery/PLAN.md`.

### 5.4 Export

- **PDF (server-side, Puppeteer)** so the PDF matches the preview exactly:
  1. The server creates a short-lived signed print token (JWT, about 2 minutes, scoped to one CV).
  2. Puppeteer opens the client route `/print/:cvId?token=…` (client URL from `.env`).
  3. The print page fetches the CV via `GET /api/cvs/:id/print-data` using the token and signals it is ready after `document.fonts.ready`.
  4. The server calls `page.pdf({ format: 'A4', printBackground: true })` and streams the file.
  - Text in the PDF must be selectable.
- **Excel (exceljs):** one worksheet per section (Personal, Education, Experience, Skills, Projects, Certifications, Languages) with formatted headers and sensible column widths.
- File names: `<FullName>_<CVTitle>_CV.pdf` / `.xlsx` (sanitised).
- Every download is recorded in the activity log.

### 5.5 Advanced features (the algorithmic core of the project)

#### A. CV Strength Score — `server/src/algorithms/cvStrengthScorer.js`

A rule-based weighted scoring model that rates a CV out of 100 and returns a breakdown and improvement suggestions.

- **Completeness (40 points):** personal details, photo, summary, at least 1 education entry, at least 1 experience or project entry, at least 5 skills, contact details.
- **Content quality (60 points):** summary length within a target word range; action verbs used in experience/project descriptions (list in `server/src/data/actionVerbs.js`); quantified achievements (numbers, percentages, amounts); valid email/phone formats; no date inconsistencies; descriptions neither too short nor too long.
- All weights and thresholds live in one config object (`server/src/config/scoringConfig.js`) so they are easy to explain and adjust.
- Output: `{ totalScore, breakdown: [{ criterion, maxPoints, earned, passed }], suggestions: [string] }`.
- Recalculate on every save and store the latest score on the CV document.

#### B. CV–Job Match Analyser (ATS simulation) — `server/src/algorithms/jobMatcher.js`

The user pastes a job description and selects one of their CVs; the system measures how well they match.

1. **Text preprocessing** (`textProcessor.js`): lowercase; normalise protected technical terms _before_ removing punctuation using a dictionary (e.g. "node.js" → "nodejs", "c++" → "cplusplus", "c#" → "csharp"); remove punctuation; tokenise; remove stop words (own list in `server/src/data/stopWords.js`); a simple suffix-stripping stemmer written by us; bigrams for common multi-word skills (e.g. "machine learning").
2. **TF-IDF** (`tfidf.js`): term frequency normalised by document length; **smoothed IDF** `idf(t) = ln((1 + N) / (1 + df(t))) + 1` so weights never become zero with a small corpus. Corpus = seed job descriptions (`server/src/data/seedJobDescriptions.json`, about 30 samples across IT, business, design, etc.) plus job descriptions previously analysed in the system.
3. **Cosine similarity** (`cosineSimilarity.js`) between the CV vector and the job description vector.
4. **Keyword gap analysis:** take the top-N weighted job description terms and split them into matched (found in the CV) and missing (not found).
5. **Skill coverage:** percentage of skills detected in the job description (using `server/src/data/skillsDictionary.js`) that appear in the CV's skills section.
6. **Overall match score:** weighted combination of cosine similarity and skill coverage (weights in config, reasoning documented in `docs/algorithms.md`).

- Output: `{ matchScore, cosineSimilarity, skillCoverage, matchedKeywords, missingKeywords, suggestions }`.
- Save each analysis (`JobMatch` collection) so users can view their history and the admin can analyse skill-gap trends.

### 5.6 Admin panel

- **Dashboard (business intelligence):** KPI cards (total users, active users, total CVs, downloads by format, average strength score); charts for registrations per month, CVs created per month, template popularity, downloads by format, strength score distribution, top 10 skills across all CVs, and top 10 most frequently missing keywords from job matches. Use MongoDB aggregation pipelines.
- **User management:** list with search, filters (status, date range) and pagination; view a user and their CVs; block/unblock; soft delete.
- **CV management:** list all CVs with filters; read-only preview; delete inappropriate CVs.
- **Template management:** activate/deactivate templates; edit name, description and default settings.
- **Reports:** users, CV generation, downloads, template usage, and job match / skill-gap reports, each with a date-range filter and export to Excel and PDF.
- **Activity log:** paginated, filterable list of key events.

## 6. Data model (Mongoose)

- **User:** name, email (unique, lowercase), passwordHash (absent for a Google-only account), googleId (unique, sparse), hasPassword, role (`user` | `jobseeker` | `employer` | `admin` — kept in step with `accountType` by a pre-save hook for everyone but the admin, so the database says what each account is), accountType (`jobseeker` | `employer`, null until chosen), avatarUrl, jobSeekerProfile { position, industry, yearsExperience, openToWork, employmentTypes[], location, about }, status (`active` | `blocked`), lastLoginAt, isDeleted, timestamps.
- **CV:** user (ref), title, templateKey, settings { primaryColor, backgroundColor, textColor, fontFamily, fontSize, themePreset, spacing, sectionOrder[], hiddenSections[] }, personal { … }, summary, education[], experience[], skills[], projects[], certifications[], languages[], references[], referencesOnRequest, strengthScore, strengthBreakdown, isDeleted, timestamps. Indexes on `user` and `updatedAt`.
- **Template:** key (unique, one of the keys the client can render), name, description, isActive, sortOrder, usesPhoto, timestamps. The markup stays in the client component; the database holds only the catalogue entry beside it — the name shown in the picker and whether the template is offered at all.
- **JobMatch:** user (ref), cv (ref), jobTitle (optional), jobDescription, matchScore, cosineSimilarity, skillCoverage, matchedKeywords[], missingKeywords[], timestamps.
- **Application:** job (ref), applicant (ref), cv (a frozen snapshot, not a reference — editing the CV afterwards must not change what the employer received), coverLetter, status (`submitted` | `reviewed` | `shortlisted` | `rejected` | `withdrawn`), employerNote, timestamps.
- **ActivityLog:** user (ref), action (`REGISTER`, `LOGIN`, `CV_CREATE`, `CV_UPDATE`, `CV_DELETE`, `DOWNLOAD_PDF`, `DOWNLOAD_DOCX`, `DOWNLOAD_EXCEL`, `CV_IMPORT`, `CV_TAILOR`, `JOB_MATCH`, `COMPANY_CREATE`, `JOB_CREATE`, `JOB_DELETE`, `JOB_APPLY`, `ADMIN_ACTION`), cv (ref, optional), meta (object), ip, timestamps.

## 7. REST API

All routes are prefixed with `/api`. JSON responses use the shape `{ success, data, message }`. Errors go through one central error-handling middleware.

- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/google` (body: credential — the Google ID token; signs in, links an existing account by verified email, or creates one with no password; never for the admin), `POST /auth/logout`, `GET /auth/me`
- **Profile:** `PUT /users/me` (name, and `jobSeekerProfile` for a job seeker), `PUT /users/me/password`, `POST /users/me/avatar`, `PATCH /users/me/account-type` (body: accountType `jobseeker` | `employer`; set once)
- **Companies (employer accounts only):** `GET /companies/mine`, `POST /companies` (name, location, registrationNumber, phone, email required; starts `pending`), `PUT /companies/mine` (refused once approved; resubmits a rejected company), `POST /companies/mine/logo`, `DELETE /companies/mine/logo`, `POST /companies/mine/document` (registration document, PDF/JPG/PNG ≤ 5 MB, private), `GET /companies/:id/document` (owner or admin only), `GET /companies/:id` (public profile, approved companies only)
- **CVs (owner only):** `GET /cvs`, `POST /cvs`, `GET /cvs/:id`, `PUT /cvs/:id`, `DELETE /cvs/:id`, `POST /cvs/:id/duplicate`, `POST /cvs/:id/photo`, `GET /cvs/:id/score`, `PATCH /cvs/:id/primary`, `DELETE /cvs/:id/primary`, `POST /cvs/:id/import` (read an uploaded CV file into the builder), `GET /cvs/:id/export/pdf`, `GET /cvs/:id/export/docx`, `GET /cvs/:id/export/excel`, `GET /cvs/:id/print-data` (print token only)
- **Job-tailored rewrite (owner only):** `POST /cvs/:id/tailor` (preview a rewrite against one advert), `POST /cvs/:id/tailor/save` (store it as a new CV), `POST /cvs/primary/tailor` (the same against the primary CV and a pasted description)
- **Jobs:** `GET /jobs` (public board, approved companies only), `GET /jobs/:id`, `POST /jobs`, `PUT /jobs/:id`, `DELETE /jobs/:id` (employer, approved company), `GET /jobs/mine/posted`, `GET /jobs/mine/saved`, `POST /jobs/:id/save`, `DELETE /jobs/:id/save`, `POST /jobs/:id/apply`, `GET /jobs/:id/applications` (the post's owner)
- **Applications:** `GET /applications/mine`, `GET /applications/:id`, `PATCH /applications/:id/status` (the employer moves it; the applicant may only withdraw), `GET /applications/:id/download/:format` (`pdf` | `docx`, the CV exactly as submitted)
- **Job match:** `POST /job-match` (body: cvId, jobDescription, jobTitle), `GET /job-match` (own history, paginated), `GET /job-match/:id`, `DELETE /job-match/:id`, `POST /job-match/scores` (badges for a page of the board), `POST /job-match/from-upload` (multipart: a dropped CV file, ranked against every open job; nothing is stored)
- **Candidate directory (approved employers and the admin):** `GET /talent?industry=&employmentType=&openToWork=&search=&page=` (job seekers only; an admin may add `accountType=employer`), `GET /talent/:id` (the person and their primary CV), `GET /talent/filters` (the industry and employment-type lists)
- **Reviews:** `GET /reviews` (public), `GET /reviews/mine`, `POST /reviews`
- **Templates:** `GET /templates` (active only; returns the whole catalogue when it has never been seeded, so the builder is never left with nothing to choose)
- **Admin (admin role only):** `GET /admin/stats`, `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`, `DELETE /admin/users/:id`, `GET /admin/cvs`, `GET /admin/cvs/:id`, `DELETE /admin/cvs/:id`, `GET /admin/companies?status=pending|approved|rejected&search=&page=`, `GET /admin/companies/:id`, `PATCH /admin/companies/:id/status` (body: status `approved` | `rejected`, reason required to reject; approval needs a document), `GET /admin/templates` (including deactivated), `PATCH /admin/templates/:id` (isActive, name, description, sortOrder; the last active template cannot be switched off), `GET /admin/reports/:type?from=&to=&format=xlsx|pdf` (type: `users` | `cvs` | `downloads` | `templates` | `job-matches`; without `format` it returns JSON for the on-screen preview), `GET /admin/activity`

## 8. Folder structure

```
cv-generator/
├── CLAUDE.md
├── package.json              # root scripts (dev, test, seed) using concurrently
├── client/
│   └── src/
│       ├── api/              # axios instance + API functions
│       ├── components/       # shared UI (forms, buttons, modals, layout)
│       ├── context/          # AuthContext
│       ├── pages/            # auth/, user/, admin/, print/
│       ├── routes/           # ProtectedRoute, AdminRoute
│       ├── templates/        # 5 CV template components + shared styles
│       └── utils/
├── server/
│   ├── src/
│   │   ├── algorithms/       # textProcessor, tfidf, cosineSimilarity, cvStrengthScorer, jobMatcher
│   │   ├── config/           # db connection, env loading, scoringConfig
│   │   ├── controllers/
│   │   ├── data/             # stopWords, actionVerbs, skillsDictionary, seedJobDescriptions
│   │   ├── middleware/       # auth, role, validate, upload, errorHandler, rateLimit
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/         # pdfService, excelService, reportService, activityLogger
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/              # seedAdmin.js, seedTemplates.js
│   ├── tests/                # unit/ (algorithms), integration/ (API)
│   └── uploads/              # git-ignored
└── docs/                     # report support material (section 10)
```

## 9. Development phases

Stop after each phase for my review and approval.

| Phase | Scope                                                                                                         | Report section it supports   |
| ----- | ------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 0     | Monorepo setup, tooling, `.env.example`, MongoDB connection, health-check route, README with run instructions | 4.1.1 Tools used             |
| 1     | Auth, roles, admin seed script, protected routes (server and client), profile                                 | 4.1.2 Implementation details |
| 2     | CV model and CRUD API, multi-step builder, photo upload, autosave, My CVs dashboard                           | 4.1.2                        |
| 3     | Five templates, live preview, customisation panel, section order/visibility                                   | 3.2 Interface design, 4.1.2  |
| 4     | PDF and Excel export, download logging                                                                        | 4.1.2                        |
| 5     | CV Strength Score and CV–Job Match Analyser (algorithms, UI, history) with unit tests                         | 3.3 Algorithm details        |
| 6     | Admin panel: BI dashboard, users, CVs, templates, report exports, activity log                                | 4.1.2                        |
| 7     | Integration and system tests, responsive/accessibility polish, error states, final documentation              | 4.2 Testing                  |
| Later | AI integration (only when I ask for it)                                                                       | —                            |

Midterm defence target (week 12): Phases 0–4 complete and Phase 5 started.

## 10. Documentation to maintain in `/docs`

The report follows the **Object-Oriented approach** from the TU guideline.

- `docs/diagrams/` — PlantUML sources for: use case diagram, class diagram, object diagram, sequence diagrams (login, create CV, download PDF, job match), state diagrams (CV lifecycle, user account status), activity diagram (CV creation to download), component diagram, deployment diagram; plus a Mermaid ER-style diagram of collections and references.
- `docs/algorithms.md` — for each algorithm: purpose, formulas, pseudocode, flowchart (Mermaid) and a small worked numeric example.
- `docs/implementation-notes.md` — module-by-module description of key classes and functions.
- `docs/test-cases.md` — separate tables for unit tests and system tests with columns: Test ID, Module, Description, Input/Steps, Expected Result, Actual Result, Status.
- `docs/tools-used.md` — languages, frameworks, libraries (with their purpose), CASE tools and database.

## 11. Non-functional requirements

- Responsive on mobile, tablet and desktop; accessible (form labels, keyboard navigation, sufficient colour contrast).
- PDF generation completes in under about 5 seconds for a typical 2-page CV.
- Clear loading, empty and error states on every page.
- Outcomes the user should be told about in passing — a login, a save, a refused form, a download, a logout — appear as a toast in the bottom-right corner (`client/src/components/ui/Toast.jsx`), red for a failure and green for a success, timed out but dismissible. A page that failed to load, and a message that marks one particular field, stay in the page.
- Consistent validation messages on client and server.
- Pagination on all admin lists.

## 12. Commands (create in Phase 0 and keep this list updated)

- `npm run dev` — start client and server together
- `npm run test` — run all tests
- `npm run setup:chrome` — install the system libraries headless Chromium needs for PDF
  export (Debian/Ubuntu/WSL, needs sudo; run once per machine)
- `npm run setup:google -- "<downloaded client_secret_….json>"` — write the Google OAuth client ID
  into `server/.env` and `client/.env` for "Continue with Google" (the client secret is not copied)
- `npm run seed:admin` — create the admin account from `.env`
- `npm run seed:templates` — fill the template catalogue (safe to re-run; it never undoes an admin's rename or deactivation)
- `npm run seed:jobs` — insert the ten sample job adverts
- `npm run seed:talent` — demo data for the candidate directory: two employers (one approved, one left pending), eight job seekers across six industries with a primary CV each, and four adverts
- `npm run migrate:accounts` — one-off upgrade for a database created before account types: existing companies become approved, company owners become employers, everyone else chooses on next login (safe to re-run)
- `npm run seed:loadtest` — bulk test data for load and performance testing: ~100 users with
  CVs, 150 jobs across 8 companies, 24 reviews, job matches and activity
  (`-- --clear` to replace the previous run, `-- --only-clear` to remove it; flags
  `--users --max-cvs --jobs --reviews --matches --seed`; credentials written to
  `server/scripts/output/loadtest-users.csv`)
