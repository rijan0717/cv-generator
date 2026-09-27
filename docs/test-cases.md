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

| Test ID | Module | Description | Input / Steps | Expected Result | Actual Result | Status |
| ------- | ------ | ----------- | ------------- | --------------- | ------------- | ------ |
|         |        |             |               |                 |               |        |

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
