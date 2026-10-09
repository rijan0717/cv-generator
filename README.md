# Smart CV Generator with ATS-Based CV–Job Matching

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

## 4a. Running over HTTPS (optional)

The application runs over plain HTTP by default. A developer who wants to test
it over TLS — secure cookies, mixed-content warnings, clipboard and other
browser features that only work on a secure origin — can switch it on without
changing any code.

### Step 1 — create a development certificate

```bash
npm run certs:dev
```

This writes a self-signed certificate valid for `localhost` into `certs/`
(git-ignored, so the private key is never committed). It needs OpenSSL, which
is already installed on WSL, Linux and macOS. Re-run with
`npm run certs:dev -- --force` to replace an expired one.

### Step 2 — turn HTTPS on

In `server/.env`:

```ini
HTTPS_ENABLED=true
HTTPS_KEY_PATH=../certs/localhost-key.pem
HTTPS_CERT_PATH=../certs/localhost-cert.pem
HTTPS_ALLOW_SELF_SIGNED=true
CLIENT_URL=https://localhost:5173
```

In `client/.env`:

```ini
VITE_HTTPS_ENABLED=true
VITE_HTTPS_KEY_PATH=../certs/localhost-key.pem
VITE_HTTPS_CERT_PATH=../certs/localhost-cert.pem
VITE_API_PROXY_TARGET=https://localhost:5000
VITE_API_PROXY_SECURE=false
```

### Step 3 — run as usual

```bash
npm run dev
```

The client is then at `https://localhost:5173` and the API at
`https://localhost:5000`. The browser warns once that the certificate is not
trusted; that is expected for a self-signed certificate, and you can accept it
and continue.

### What changes when it is on

- The Express server listens with `https.createServer` instead of plain HTTP.
- The Vite dev server serves the client over TLS and proxies `/api` and
  `/uploads` to the HTTPS API, accepting the development certificate.
- The authentication cookie is marked `secure`, so it is only ever sent over
  TLS — the same behaviour as production, now testable locally.
- Puppeteer is told to accept the development certificate, so PDF export keeps
  working against the HTTPS print page.

Set `HTTPS_ENABLED=false` and `VITE_HTTPS_ENABLED=false` (and put the two URLs
back to `http://`) to return to plain HTTP. Both default to off, so leaving the
settings out entirely also keeps the original behaviour.

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
| `npm run seed:admin`        | Create the admin account from `server/.env`                           |
| `npm run seed:templates`    | Insert the five CV templates                                          |
| `npm run seed:jobs`         | Insert the ten sample job adverts                                     |
| `npm run seed:qa-demo`      | Insert the QA demo data set                                           |
| `npm run seed:loadtest`     | Bulk test data for load and performance testing                       |
| `npm run certs:dev`         | Create a self-signed HTTPS certificate for localhost                  |
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

## 9. Documentation

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

## 10. Troubleshooting

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
