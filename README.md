# Smart CV Generator with ATS-Based CV–Job Matching

Academic project for **Tribhuvan University, BCA 6th semester, Project II (CAPJ356)**.

A MERN-stack web application that lets a user build multiple CVs from five
templates, customise them, export them as PDF and Excel, score how strong a CV
is, and measure how well a CV matches a pasted job description using an
ATS-style TF-IDF and cosine-similarity analysis.

The scoring and matching algorithms are written from scratch in plain
JavaScript — no NLP, machine-learning or string-similarity libraries are used.

---

## 1. Technology

|  | How the whole system works, end to end. Start here |
| Layer                |  | How the whole system works, end to end. Start here |
| Technology                                                        |
|  | How the whole system works, end to end. Start here |
| -------------------- |  | How the whole system works, end to end. Start here |
| ----------------------------------------------------------------- |
|  | How the whole system works, end to end. Start here |
| Frontend (`client/`) |  | How the whole system works, end to end. Start here |
| React 18 + Vite, React Router, Tailwind CSS, Axios, Recharts      |
|  | How the whole system works, end to end. Start here |
| Backend (`server/`)  |  | How the whole system works, end to end. Start here |
| Node.js + Express 4, ES modules                                   |
|  | How the whole system works, end to end. Start here |
| Database             |  | How the whole system works, end to end. Start here |
| MongoDB with Mongoose                                             |
|  | How the whole system works, end to end. Start here |
| Authentication       |  | How the whole system works, end to end. Start here |
| bcryptjs, jsonwebtoken, cookie-parser (JWT in an httpOnly cookie) |
|  | How the whole system works, end to end. Start here |
| Security             |  | How the whole system works, end to end. Start here |
| helmet, cors, express-rate-limit, express-validator               |
|  | How the whole system works, end to end. Start here |
| Export               |  | How the whole system works, end to end. Start here |
| puppeteer (PDF), exceljs (Excel)                                  |
|  | How the whole system works, end to end. Start here |
| Testing              |  | How the whole system works, end to end. Start here |
| Vitest, Supertest, mongodb-memory-server, React Testing Library   |
|  | How the whole system works, end to end. Start here |
| Tooling              |  | How the whole system works, end to end. Start here |
| ESLint, Prettier, nodemon, concurrently                           |

---

## 2. Prerequisites

- **Node.js** 20 LTS or newer (`node --version`)
- **npm** 10 or newer (`npm --version`)
- **MongoDB** 6 or newer running locally, or a MongoDB Atlas connection string
  - Check a local server with: `mongosh --eval "db.runCommand({ ping: 1 })"`
- **Git**

> **On Windows, run this project inside WSL, not from Windows itself.** The
> repository lives on the WSL filesystem, and Node, npm and MongoDB must all
> run inside Ubuntu. Driving it from Windows over `\\wsl.localhost` fails in
> several ways — see `docs/mongodb.md` section 8.

---

## 3. First-time setup

### On WSL / Linux (recommended)

One script installs Node.js, npm and MongoDB, then installs the project
dependencies and creates the environment files:

```bash
bash scripts/setup-wsl.sh
```

It is safe to re-run, and asks for your sudo password once.

### Manually

```bash
# 1. Install dependencies for the root, the server and the client
npm run install:all

# 2. Create the server environment file and edit the values
cp server/.env.example server/.env

# 3. Create the client environment file (defaults are fine for development)
cp client/.env.example client/.env
```

> **Why three installs instead of npm workspaces?** Each package keeps its own
> `node_modules` and the root scripts delegate with `--prefix`. This avoids the
> workspace symbolic links, which cannot be created when the project is reached
> from Windows over a UNC path. `npm run install:all` does all three in order.

Then open `server/.env` and set at least:

|  | How the whole system works, end to end. Start here |
| Variable                        |  | How the whole system works, end to end. Start here |
| Purpose                                          |
|  | How the whole system works, end to end. Start here |
| ------------------------------- |  | How the whole system works, end to end. Start here |
| ------------------------------------------------ |
|  | How the whole system works, end to end. Start here |
| `MONGODB_URI`                   |  | How the whole system works, end to end. Start here |
| Where MongoDB is running                         |
|  | How the whole system works, end to end. Start here |
| `JWT_SECRET`                    |  | How the whole system works, end to end. Start here |
| Long random string used to sign login tokens     |
|  | How the whole system works, end to end. Start here |
| `PRINT_TOKEN_SECRET`            |  | How the whole system works, end to end. Start here |
| Long random string used to sign PDF print tokens |
|  | How the whole system works, end to end. Start here |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` |  | How the whole system works, end to end. Start here |
| Credentials used by `npm run seed:admin`         |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`server/.env` is git-ignored and must never be committed. Only
`server/.env.example` is tracked.

---

## 4. Running the application

```bash
npm run dev
```

This starts both processes together:

|  | How the whole system works, end to end. Start here |
| Process      |  | How the whole system works, end to end. Start here |
| URL                              |
|  | How the whole system works, end to end. Start here |
| ------------ |  | How the whole system works, end to end. Start here |
| -------------------------------- |
|  | How the whole system works, end to end. Start here |
| Express API  |  | How the whole system works, end to end. Start here |
| http://localhost:5000            |
|  | How the whole system works, end to end. Start here |
| React client |  | How the whole system works, end to end. Start here |
| http://localhost:5173            |
|  | How the whole system works, end to end. Start here |
| Health check |  | How the whole system works, end to end. Start here |
| http://localhost:5000/api/health |

The Vite dev server proxies `/api` and `/uploads` to the Express server, so the
browser treats both as the same origin and the authentication cookie works
without extra CORS configuration.

Run them separately if you prefer:

```bash
npm run dev:server
npm run dev:client
```

---

## 5. All commands

|  | How the whole system works, end to end. Start here |
| Command                     |  | How the whole system works, end to end. Start here |
| What it does                                                          |
|  | How the whole system works, end to end. Start here |
| --------------------------- |  | How the whole system works, end to end. Start here |
| --------------------------------------------------------------------- |
|  | How the whole system works, end to end. Start here |
| `bash scripts/setup-wsl.sh` |  | How the whole system works, end to end. Start here |
| One-time environment setup on WSL/Linux (Node, MongoDB, dependencies) |
|  | How the whole system works, end to end. Start here |
| `npm run install:all`       |  | How the whole system works, end to end. Start here |
| Install dependencies for the root, the server and the client          |
|  | How the whole system works, end to end. Start here |
| `npm run dev`               |  | How the whole system works, end to end. Start here |
| Start the client and the server together                              |
|  | How the whole system works, end to end. Start here |
| `npm run dev:server`        |  | How the whole system works, end to end. Start here |
| Start only the Express server (nodemon)                               |
|  | How the whole system works, end to end. Start here |
| `npm run dev:client`        |  | How the whole system works, end to end. Start here |
| Start only the Vite dev server                                        |
|  | How the whole system works, end to end. Start here |
| `npm run build`             |  | How the whole system works, end to end. Start here |
| Build the client for production                                       |
|  | How the whole system works, end to end. Start here |
| `npm test`                  |  | How the whole system works, end to end. Start here |
| Run all server and client tests                                       |
|  | How the whole system works, end to end. Start here |
| `npm run test:server`       |  | How the whole system works, end to end. Start here |
| Run server tests only (Vitest + Supertest)                            |
|  | How the whole system works, end to end. Start here |
| `npm run test:client`       |  | How the whole system works, end to end. Start here |
| Run client tests only (Vitest + React Testing Library)                |
|  | How the whole system works, end to end. Start here |
| `npm run seed:admin`        |  | How the whole system works, end to end. Start here |
| Create the admin account from `server/.env` _(Phase 1)_               |
|  | How the whole system works, end to end. Start here |
| `npm run seed:templates`    |  | How the whole system works, end to end. Start here |
| Insert the five CV templates _(Phase 3)_                              |
|  | How the whole system works, end to end. Start here |
| `npm run lint`              |  | How the whole system works, end to end. Start here |
| Check code style with ESLint                                          |
|  | How the whole system works, end to end. Start here |
| `npm run format`            |  | How the whole system works, end to end. Start here |
| Format the whole project with Prettier                                |

---

## 6. Project structure

```
cvgenerator/
├── CLAUDE.md                 # project brief and working rules
├── package.json              # root scripts (dev, test, seed, lint, format)
├── eslint.config.js          # shared ESLint flat config (server + client)
├── client/
│   └── src/
│       ├── api/              # Axios instance and API functions
│       ├── components/       # shared UI components
│       ├── context/          # AuthContext
│       ├── pages/            # auth/, user/, admin/, print/
│       ├── routes/           # ProtectedRoute, AdminRoute
│       ├── templates/        # the five CV template components
│       └── utils/
├── server/
│   ├── src/
│   │   ├── algorithms/       # textProcessor, tfidf, cosineSimilarity,
│   │   │                     # cvStrengthScorer, jobMatcher (own code)
│   │   ├── config/           # env loading, database connection, scoringConfig
│   │   ├── controllers/
│   │   ├── data/             # stopWords, actionVerbs, skillsDictionary,
│   │   │                     # seedJobDescriptions
│   │   ├── middleware/       # auth, role, validate, upload, errorHandler
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/         # pdfService, excelService, reportService
│   │   ├── utils/            # ApiError, response helpers, asyncHandler
│   │   ├── app.js            # builds the Express app (no listening)
│   │   └── server.js         # connects to MongoDB and starts the server
│   ├── scripts/              # seedAdmin.js, seedTemplates.js
│   ├── tests/                # unit/ (algorithms), integration/ (API)
│   └── uploads/              # uploaded photos (git-ignored)
└── docs/                     # diagrams, algorithm notes, test cases
```

---

## 7. API response format

Every endpoint returns the same JSON shape, so the client handles all responses
the same way:

```jsonc
// success
{ "success": true,  "data": { }, "message": "OK" }

// failure (produced by the central error-handling middleware)
{ "success": false, "data": null, "message": "CV not found" }
```

---

## 8. Testing

```bash
npm test
```

- **Server unit tests** (`server/tests/unit/`) cover the algorithms in
  `server/src/algorithms/`.
- **Server integration tests** (`server/tests/integration/`) call the API with
  Supertest against an in-memory MongoDB instance, so the development database
  is never touched.
- **Client tests** cover the key components with React Testing Library.

> The first server test run downloads a MongoDB binary for
> `mongodb-memory-server`, which can take a few minutes.

---

## 9. Development phases

|  | How the whole system works, end to end. Start here |
| Phase |  | How the whole system works, end to end. Start here |
| Scope                                                                                |  | How the whole system works, end to end. Start here |
| Status      |
|  | How the whole system works, end to end. Start here |
| ----- |  | How the whole system works, end to end. Start here |
| ------------------------------------------------------------------------------------ |  | How the whole system works, end to end. Start here |
| ----------- |
|  | How the whole system works, end to end. Start here |
| 0     |  | How the whole system works, end to end. Start here |
| Monorepo setup, tooling, environment files, MongoDB connection, health check, README |  | How the whole system works, end to end. Start here |
| In progress |
|  | How the whole system works, end to end. Start here |
| 1     |  | How the whole system works, end to end. Start here |
| Authentication, roles, admin seed script, protected routes, profile                  |  | How the whole system works, end to end. Start here |
| Not started |
|  | How the whole system works, end to end. Start here |
| 2     |  | How the whole system works, end to end. Start here |
| CV model and CRUD API, multi-step builder, photo upload, autosave, My CVs dashboard  |  | How the whole system works, end to end. Start here |
| Not started |
|  | How the whole system works, end to end. Start here |
| 3     |  | How the whole system works, end to end. Start here |
| Five templates, live preview, customisation panel                                    |  | How the whole system works, end to end. Start here |
| Not started |
|  | How the whole system works, end to end. Start here |
| 4     |  | How the whole system works, end to end. Start here |
| PDF and Excel export, download logging                                               |  | How the whole system works, end to end. Start here |
| Not started |
|  | How the whole system works, end to end. Start here |
| 5     |  | How the whole system works, end to end. Start here |
| CV Strength Score and CV–Job Match Analyser + unit tests                             |  | How the whole system works, end to end. Start here |
| Not started |
|  | How the whole system works, end to end. Start here |
| 6     |  | How the whole system works, end to end. Start here |
| Admin panel: BI dashboard, users, CVs, templates, reports, activity log              |  | How the whole system works, end to end. Start here |
| Not started |
|  | How the whole system works, end to end. Start here |
| 7     |  | How the whole system works, end to end. Start here |
| Integration and system tests, responsive/accessibility polish, documentation         |  | How the whole system works, end to end. Start here |
| Not started |

---

## 10. Documentation

Supporting material for the project report lives in `docs/`:

| File | Contents |
| --- | --- |
| `docs/how-it-works.md` | How the whole system works, end to end. Start here |
| `docs/mongodb.md` | Database install, configuration, verification and troubleshooting |
| `docs/algorithms.md` | Purpose, formulas, pseudocode, flowcharts and worked examples |
| `docs/implementation-notes.md` | Module-by-module description of key functions |
| `docs/test-cases.md` | Unit, system and manual test case tables |
| `docs/tools-used.md` | Languages, frameworks, libraries and CASE tools |
| `docs/diagrams/` | PlantUML sources for the UML diagrams |

---

## 11. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Missing required environment variable: MONGODB_URI` | `server/.env` is missing — copy it from `server/.env.example` |
| `MongooseServerSelectionError` | MongoDB is not running (`sudo systemctl start mongod`), or `MONGODB_URI` is wrong |
| `sh: 1: vite: Permission denied` | `node_modules` was installed by Windows npm — delete it and re-run `bash scripts/setup-wsl.sh` |
| `Route not found: GET /` on port 5000 | Expected — the API only serves `/api/*`. The app is on port 5173 |
| Client loads but cannot reach the API | The Express server is not running on port 5000 |
| Port 5000 or 5173 already in use | Change `PORT` in `server/.env` or the port in `client/vite.config.js` |
| The theme switch appears to do nothing | Hard-refresh the browser (Ctrl+Shift+R); Vite caches the old stylesheet |
| PDF export returns 503 | Chromium cannot start. Install its system libraries, then retry |
