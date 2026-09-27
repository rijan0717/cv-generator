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
| Auth                      | bcryptjs, jsonwebtoken, cookie-parser (JWT in an httpOnly cookie)                                                |
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
- Customisation settings (saved per CV): primary colour, background colour, text colour, font family (curated list of 6 Google Fonts), font size (small / medium / large), theme preset (a few ready-made palettes plus light/dark), spacing (compact / normal), section visibility and section order.
- Live A4 preview (210 × 297 mm) that updates while the user edits, with correct page breaks for multi-page CVs.
- Users only see templates the admin has marked as active.

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

- **User:** name, email (unique, lowercase), passwordHash, role (`user` | `admin`), avatarUrl, status (`active` | `blocked`), lastLoginAt, isDeleted, timestamps.
- **CV:** user (ref), title, templateKey, settings { primaryColor, backgroundColor, textColor, fontFamily, fontSize, themePreset, spacing, sectionOrder[], hiddenSections[] }, personal { … }, summary, education[], experience[], skills[], projects[], certifications[], languages[], references[], referencesOnRequest, strengthScore, strengthBreakdown, isDeleted, timestamps. Indexes on `user` and `updatedAt`.
- **Template:** key (unique), name, description, thumbnailUrl, isActive, defaultSettings, timestamps.
- **JobMatch:** user (ref), cv (ref), jobTitle (optional), jobDescription, matchScore, cosineSimilarity, skillCoverage, matchedKeywords[], missingKeywords[], timestamps.
- **ActivityLog:** user (ref), action (`REGISTER`, `LOGIN`, `CV_CREATE`, `CV_UPDATE`, `CV_DELETE`, `DOWNLOAD_PDF`, `DOWNLOAD_EXCEL`, `JOB_MATCH`, `ADMIN_ACTION`), cv (ref, optional), meta (object), ip, timestamps.

## 7. REST API

All routes are prefixed with `/api`. JSON responses use the shape `{ success, data, message }`. Errors go through one central error-handling middleware.

- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- **Profile:** `PUT /users/me`, `PUT /users/me/password`, `POST /users/me/avatar`
- **CVs (owner only):** `GET /cvs`, `POST /cvs`, `GET /cvs/:id`, `PUT /cvs/:id`, `DELETE /cvs/:id`, `POST /cvs/:id/duplicate`, `POST /cvs/:id/photo`, `GET /cvs/:id/score`, `GET /cvs/:id/export/pdf`, `GET /cvs/:id/export/excel`, `GET /cvs/:id/print-data` (print token only)
- **Job match:** `POST /job-match` (body: cvId, jobDescription, jobTitle), `GET /job-match` (own history), `GET /job-match/:id`
- **Templates:** `GET /templates` (active only)
- **Admin (admin role only):** `GET /admin/stats`, `GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/status`, `DELETE /admin/users/:id`, `GET /admin/cvs`, `GET /admin/cvs/:id`, `DELETE /admin/cvs/:id`, `GET /admin/templates`, `PATCH /admin/templates/:id`, `GET /admin/reports/:type?from=&to=&format=xlsx|pdf`, `GET /admin/activity`

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
- Consistent validation messages on client and server.
- Pagination on all admin lists.

## 12. Commands (create in Phase 0 and keep this list updated)

- `npm run dev` — start client and server together
- `npm run test` — run all tests
- `npm run seed:admin` — create the admin account from `.env`
- `npm run seed:templates` — insert the five templates
