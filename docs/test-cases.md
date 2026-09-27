# Test Cases

Supports report section **4.2 Testing**.

---

## 1. Unit test cases

Unit tests live in `server/tests/unit/` and cover the algorithms in
`server/src/algorithms/`. They are written in Phase 5.

| Test ID | Module | Description | Input / Steps | Expected Result | Actual Result | Status |
| ------- | ------ | ----------- | ------------- | --------------- | ------------- | ------ |
|         |        |             |               |                 |               |        |

---

## 2. System test cases

System tests live in `server/tests/integration/` and drive the API with
Supertest.

| Test ID | Module         | Description                                   | Input / Steps                          | Expected Result                                           | Actual Result                                   | Status |
| ------- | -------------- | --------------------------------------------- | -------------------------------------- | --------------------------------------------------------- | ----------------------------------------------- | ------ |
| ST-001  | Infrastructure | Health check responds                         | Send `GET /api/health`                 | 200 with `success: true` and `data.status` equal to `ok`  | As expected, and `data.database` is `connected` | Pass   |
| ST-002  | Infrastructure | Unknown route is handled                      | Send `GET /api/does-not-exist`         | 404 with `success: false` and a "Route not found" message | As expected                                     | Pass   |
| ST-003  | Infrastructure | Client reaches the API through the Vite proxy | Request `GET /api/health` on port 5173 | Same payload as calling port 5000 directly                | As expected                                     | Pass   |

---

## 3. How the tests are run

| Command               | Scope                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| `npm test`            | Every server and client test                                             |
| `npm run test:server` | Vitest and Supertest against the Express app, using an in-memory MongoDB |
| `npm run test:client` | Vitest and React Testing Library                                         |
