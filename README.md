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

| Layer                | Technology                                                        |
| -------------------- | ----------------------------------------------------------------- |
| Frontend (`client/`) | React 18 + Vite, React Router, Tailwind CSS, Axios, Recharts      |
| Backend (`server/`)  | Node.js + Express 4, ES modules                                   |
| Database             | MongoDB with Mongoose                                             |
| Authentication       | bcryptjs, jsonwebtoken, cookie-parser (JWT in an httpOnly cookie) |
| Security             | helmet, cors, express-rate-limit, express-validator               |
| Export               | puppeteer (PDF), exceljs (Excel)                                  |
| Testing              | Vitest, Supertest, mongodb-memory-server, React Testing Library   |
| Tooling              | ESLint, Prettier, nodemon, concurrently                           |

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

| Variable                        | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `MONGODB_URI`                   | Where MongoDB is running                         |
| `JWT_SECRET`                    | Long random string used to sign login tokens     |
| `PRINT_TOKEN_SECRET`            | Long random string used to sign PDF print tokens |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credentials used by `npm run seed:admin`         |

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

| Process      | URL                              |
| ------------ | -------------------------------- |
| Express API  | http://localhost:5000            |
| React client | http://localhost:5173            |
| Health check | http://localhost:5000/api/health |

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

| Command                     | What it does                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `bash scripts/setup-wsl.sh` | One-time environment setup on WSL/Linux (Node, MongoDB, dependencies) |
| `npm run install:all`       | Install dependencies for the root, the server and the client          |
| `npm run dev`               | Start the client and the server together                              |
| `npm run dev:server`        | Start only the Express server (nodemon)                               |
| `npm run dev:client`        | Start only the Vite dev server                                        |
| `npm run build`             | Build the client for production                                       |
| `npm test`                  | Run all server and client tests                                       |
| `npm run test:server`       | Run server tests only (Vitest + Supertest)                            |
| `npm run test:client`       | Run client tests only (Vitest + React Testing Library)                |
| `npm run seed:admin`        | Create the admin account from `server/.env` _(Phase 1)_               |
| `npm run seed:templates`    | Insert the five CV templates _(Phase 3)_                              |
| `npm run lint`              | Check code style with ESLint                                          |
| `npm run format`            | Format the whole project with Prettier                                |

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

| Phase | Scope                                                                                | Status      |
| ----- | ------------------------------------------------------------------------------------ | ----------- |
| 0     | Monorepo setup, tooling, environment files, MongoDB connection, health check, README | In progress |
| 1     | Authentication, roles, admin seed script, protected routes, profile                  | Not started |
| 2     | CV model and CRUD API, multi-step builder, photo upload, autosave, My CVs dashboard  | Not started |
| 3     | Five templates, live preview, customisation panel                                    | Not started |
| 4     | PDF and Excel export, download logging                                               | Not started |
| 5     | CV Strength Score and CV–Job Match Analyser + unit tests                             | Not started |
| 6     | Admin panel: BI dashboard, users, CVs, templates, reports, activity log              | Not started |
| 7     | Integration and system tests, responsive/accessibility polish, documentation         | Not started |

---

## 10. Documentation

Supporting material for the project report lives in `docs/`:

| File                           | Contents                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `docs/diagrams/`               | PlantUML sources for use case, class, object, sequence, state, activity, component and deployment diagrams |
| `docs/algorithms.md`           | Purpose, formulas, pseudocode, flowcharts and worked examples                                              |
| `docs/implementation-notes.md` | Module-by-module description of key functions                                                              |
| `docs/test-cases.md`           | Unit and system test case tables                                                                           |
| `docs/tools-used.md`           | Languages, frameworks, libraries and CASE tools                                                            |

---

## 11. Troubleshooting

| Problem                                              | Fix                                                                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Missing required environment variable: MONGODB_URI` | `server/.env` is missing — copy it from `server/.env.example`                                  |
| `MongooseServerSelectionError`                       | MongoDB is not running (`sudo systemctl start mongod`), or `MONGODB_URI` is wrong              |
| `sh: 1: vite: Permission denied`                     | `node_modules` was installed by Windows npm — delete it and re-run `bash scripts/setup-wsl.sh` |
| `Route not found: GET /` on port 5000                | Expected — the API only serves `/api/*`. The app is on port 5173                               |
| Client loads but the health card shows an error      | The Express server is not running on port 5000                                                 |
| Port 5000 or 5173 already in use                     | Change `PORT` in `server/.env` or the port in `client/vite.config.js`                          |
