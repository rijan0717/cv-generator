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

_To be completed._

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
