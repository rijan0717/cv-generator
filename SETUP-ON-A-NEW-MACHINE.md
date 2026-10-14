# Setting this project up on another machine

Everything needed is in this archive except the three things you install:
Node.js, MongoDB and Git. `node_modules` is deliberately left out — it is
600MB of platform-specific binaries that `npm install` rebuilds correctly for
whatever machine you are on. Copying it across would not work anyway.

## What is in here

| Folder / file     | What it is                                                     |
| ----------------- | -------------------------------------------------------------- |
| `client/`         | React + Vite front end                                          |
| `server/`         | Express API, algorithms, scripts and tests                      |
| `docs/`           | Report support material — algorithms, test cases, diagrams      |
| `.git/`           | Full history, including the `feat/job-tailored-cv-rewrite` branch |
| `server/.env`     | **Real secrets.** See the warning at the bottom                 |
| `client/.env`     | Front-end config (empty API base URL, so Vite proxies)          |
| `server/uploads/` | Photos and avatars already uploaded                             |
| `database-dump/`  | A `mongodump` of the `cv_generator` database                    |
| `certs/`          | Local development certificates                                  |

## 1. Install the prerequisites

- **Node.js** — an LTS release (20 or 22). `node --version` to check.
- **MongoDB Community Server** — running locally on the default port 27017.
  `mongosh --eval "db.version()"` to check it is up.
- **Git** — only if you want to keep committing.

On Windows the project was developed inside **WSL (Ubuntu)**, with the repo at
`~/cvgenerator`. That is not a requirement — it runs natively on Windows,
macOS or Linux — but if you want an identical environment, unpack it inside
WSL rather than onto the Windows filesystem. Builds are noticeably faster that
way, because Vite and Vitest are reading a Linux filesystem rather than a
network share.

## 2. Unpack and install

```bash
cd <wherever you unpacked this>
npm install                  # root tooling
npm install --prefix server
npm install --prefix client
```

Puppeteer downloads a copy of Chromium during the server install, so give that
step a few minutes on a slow connection. PDF export is what needs it.

## 3. Restore the database

This is the step that brings back your account, your CVs, the job board and
every saved analysis. Without it you get an empty application.

```bash
mongorestore --uri="mongodb://127.0.0.1:27017" --drop database-dump/
```

`--drop` replaces any existing `cv_generator` database on the new machine.
Leave it off if you have data there you want to keep.

If `mongorestore` is not on your PATH, it ships with the **MongoDB Database
Tools**, which are a separate download from the server itself.

### Or start from seeds instead

If you would rather begin clean, skip the restore and run these — they build
the same demo data the dump contains, minus anything you created by hand:

```bash
npm run seed:templates   # the CV templates
npm run seed:admin       # the admin account, from server/.env
npm run seed:qa-demo     # rijan@admin.com, 5 CVs and 11 job adverts
```

## 4. Run it

```bash
npm run dev
```

That starts both halves together — the API on <http://localhost:5000> and the
client on <http://localhost:5173>. Open the client.

## 5. Check it works

```bash
npm test
```

320 server tests and 74 client tests should pass. The server tests use
`mongodb-memory-server`, which downloads a MongoDB binary on first run, so the
first `npm test` on a new machine is slower than the rest.

Then sign in as `rijan@admin.com` and try the Job-Tailored CV Rewrite against
the **Senior Backend Engineer** advert. It should start from the Senior
Software Engineer CV and score somewhere near 79% before the rewrite.

## A warning about `server/.env`

It contains a real `JWT_SECRET`, a real `PRINT_TOKEN_SECRET` and the admin
account's password. It is in this archive because you asked for a setup that
works without reconfiguring anything, and on your own second machine that is
reasonable.

It does mean this archive is as sensitive as a password file. Do not put it in
a shared drive, do not email it, and do not commit it — the repository's
`.gitignore` already excludes `.env`, and that exclusion came with the copy of
`.git` in here.

If the archive does end up somewhere you did not intend, rotate both secrets.
Anyone holding `JWT_SECRET` can mint a session cookie for any account:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Put the new value in `server/.env` on both machines and restart the server.
Every existing session is signed out, which is the point.
