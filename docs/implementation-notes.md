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
