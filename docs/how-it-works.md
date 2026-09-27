# How the System Works

A single place to understand the whole application: what each part does, how
a request flows through it, and why the significant decisions were made the
way they were.

Read this first. `implementation-notes.md` goes module by module,
`algorithms.md` covers the two scoring algorithms, and `mongodb.md` covers
the database.

---

## 1. The shape of the system

```
Browser ──HTTP──> Express (Node, WSL) ──Mongoose──> MongoDB (WSL)
   │                    │
   │                    ├── Puppeteer ──> /print/:id ──> PDF
   │                    ├── docx       ──> .docx
   │                    └── exceljs    ──> .xlsx
   │
   └── React (Vite dev server, proxies /api to Express)
```

Three processes run during development:

| Process     | Port | Started by      |
| ----------- | ---- | --------------- |
| MongoDB     | 27017| systemd (`mongod`) |
| Express API | 5000 | `npm run dev`   |
| React client| 5173 | `npm run dev`   |

The Vite dev server proxies `/api` and `/uploads` to Express, so the browser
sees one origin and the session cookie works without any CORS special-casing.

---

## 2. What a user can do

| Area | What happens |
| --- | --- |
| **Register / log in** | Creates a session held in an httpOnly cookie |
| **My CVs** | Create, rename, duplicate and delete CVs |
| **Editor** | Fill in every section, with a live A4 preview beside the form |
| **Design** | Change template, colours, fonts, spacing, section order and visibility |
| **Import** | Upload an existing PDF or Word CV and have it read into the form |
| **Download** | PDF, Word or Excel |
| **Review** | Rate the application after a download; can always be skipped |
| **Profile / Settings** | Change name, photo, password and theme |

An **admin** additionally sees every user, every CV, the activity log and the
dashboard statistics.

---

## 3. How a request is handled

Every API request goes through the same chain, in this order:

1. **helmet** sets secure response headers.
2. **cors** allows only the configured client origin, with credentials.
3. **body parsers** and **cookie-parser** read the request.
4. **route-level validators** (express-validator) check the input; `validate`
   turns any failure into a 400 in the standard shape.
5. **`requireAuth`** reads the session cookie, verifies the JWT, loads the
   user and rejects blocked accounts.
6. **`requireRole`** checks the role where a route needs one.
7. The **controller** runs, wrapped in `asyncHandler`.
8. **`errorHandler`** turns anything thrown into a safe HTTP response.

Because `asyncHandler` forwards rejected promises, controllers contain no
`try`/`catch`. Because `errorHandler` is the only place errors become
responses, every failure in the system looks the same to the client.

### The response shape

Every endpoint, success or failure:

```jsonc
{ "success": true,  "data": { }, "message": "OK" }
{ "success": false, "data": null, "message": "CV not found" }
```

---

## 4. Authentication and authorisation

### Sessions

Login signs a JWT holding the user id and role, and sets it as an **httpOnly
cookie**. The token is never returned in the response body and never written
to `localStorage`, because anything in `localStorage` is readable by page
scripts — which turns any cross-site scripting bug into a stolen session.

The cookie is `sameSite=lax` and `secure` in production.

### Passwords

A password is never stored. `User.passwordHash` is hashed with bcrypt at cost
12 in a `pre('save')` hook, so it cannot be forgotten at a call site. The
field is `select: false`, so it is omitted from every query unless explicitly
requested — login is the only place that asks for it. Responses are built
from `toPublicJSON()`, so a hash has no path to the client.

### Roles

There are two: `user` and `admin`. `POST /api/auth/register` hard-codes
`role: 'user'`; sending `role: 'admin'` in the body does nothing. The only
way an admin exists is `npm run seed:admin`.

### Ownership

Every CV route loads the document through `findOwnedCV(cvId, userId)`, which
scopes the query to the requesting user. Asking for somebody else's CV
returns **404, not 403** — a 403 would confirm that the id is real.

---

## 5. The CV data model

One CV is one MongoDB document. That suits the access pattern: the builder
loads a whole CV, edits it and saves it back; nothing ever reads a single
experience entry on its own.

```
CV {
  user, title, templateKey,
  settings { colours, font, size, spacing, sectionOrder[], hiddenSections[] },
  personal { fullName, headline, email, phone, address, links, photoUrl },
  summary,
  education[], experience[], skills[], projects[],
  certifications[], languages[], references[],
  strengthScore, isDeleted, timestamps
}
```

Deletes are **soft** (`isDeleted`), so admin reports and download statistics
that reference a CV stay meaningful.

Updates apply an **allow-list** of editable fields, so a client cannot set
`strengthScore` or reassign `user` by putting them in the request body.

---

## 6. Templates and the live preview

Five templates — Classic, Modern, Minimal, Creative and ATS-Friendly — are
React components that all take the same props and read every visual decision
from CSS custom properties produced by `buildTemplateVariables(settings)`.
That is what lets **one customisation panel drive all five**: no template
knows a setting exists.

### Why the preview matches the PDF

The preview renders the template at **true A4 size** (793.7px wide) and
shrinks it with a CSS `transform: scale()`. Nothing reflows at preview size.
Re-laying out at a smaller width is the usual reason a preview disagrees with
its export.

The PDF then uses the **same components**: Puppeteer opens the real
`/print/:id` page rather than the server re-drawing the CV.

### The ATS template breaks the pattern deliberately

It ignores the chosen colours and fonts: single column, no photo, no icons,
skills as a plain comma-separated line, fixed Arial, black on white. An
applicant tracking system reads the *text layer* of a PDF, so multi-column
layouts are extracted in the wrong order and decoration is noise. Losing the
styling is the point.

### The CV stays white in dark mode

The interface has a dark theme; the CV inside it does not. A CV is a printed
document, and inverting the preview would make it misrepresent the exported
file.

---

## 7. Autosave

`useAutosave` saves 1.5 seconds after typing stops. Three details make it
behave properly rather than merely work:

- **The first render never saves.** Loading a CV sets state, which would
  otherwise immediately save it back unchanged.
- **Only one request is in flight.** If the user keeps typing during a save,
  the next save is queued rather than racing.
- **Pending work is flushed on unmount**, so navigating away right after
  typing does not lose the last edit.

---

## 8. Import: reading an existing CV

Uploading a PDF or `.docx` fills the builder in automatically.

```
file ──> extractText() ──> parseCVText() ──> review ──> apply chosen sections
         (mammoth /            (our own
          pdfjs-dist)           algorithm)
```

Libraries are used **only** to turn a binary file into text: a `.docx` is a
ZIP of XML, and a PDF stores positioned glyphs rather than lines. Everything
that understands the CV is our own code in
`server/src/algorithms/cvImportParser.js`:

1. **Normalise** — tidy whitespace, quotes, line endings.
2. **Contacts** — email, phone and links found by pattern, anywhere in the
   document, because CVs put them in headers, sidebars and footers alike.
3. **Headings** — each line matched against synonym lists, so "Work History",
   "Employment" and "Professional Experience" all mean `experience`. A length
   limit stops a sentence *containing* the word being treated as a heading.
4. **Entries** — a section is split at each line carrying a date range,
   because in practice every role and qualification is headed by its dates.
5. **Fields** — dates, bullets, degree/field, grades, skill levels.

The parser is deliberately conservative: when unsure it leaves a field empty,
because a wrong value is more annoying to correct than a blank one.

**Nothing is saved automatically.** The parsed result is returned for review
and the user ticks which sections to take. The uploaded file is held in
memory and never written to disk.

---

## 9. Export

| Format | How | Why |
| --- | --- | --- |
| **PDF** | Puppeteer prints the real `/print/:id` page | Matches the preview exactly; text stays selectable |
| **Word** | `docx` library, content re-expressed as a flowing document | Someone who wants `.docx` wants to keep editing it |
| **Excel** | `exceljs`, one worksheet per section | For sorting, filtering and pasting into application forms |

### The print token

Headless Chromium has no session cookie, so the PDF route cannot rely on one:

1. The server signs a **print token** — a JWT scoped to one CV id, valid for
   about two minutes, with `purpose: 'print'`.
2. Puppeteer opens `/print/:cvId?token=…`.
3. That page fetches `GET /api/cvs/:id/print-data`, which verifies the token
   *and* that it was issued for this CV. A login token will not work here.
4. Once the data is in and `document.fonts.ready` has resolved, the page sets
   `window.__CV_READY__`.
5. The server waits for that flag, then prints A4.

Waiting on a real signal rather than a fixed delay is what stops a PDF being
captured mid-render with fallback fonts.

Every download is written to the activity log.

---

## 10. Reviews

The rating prompt appears **after a successful download** — the moment the
user has actually got something out of the application. It can always be
skipped, and the skip is remembered so nobody is asked repeatedly.

Only reviews **above three stars** appear on the home page. This is filtered
on the server, so the client never decides what is fit to publish. Every
review, whatever its rating, is stored for the admin: the home page is
marketing, a one-star review is feedback, and they belong in different
places.

The public endpoint returns a **shortened author name** ("Jane D.") and never
an email or user id, so testimonials cannot be used to enumerate users.

---

## 11. The admin panel

`requireAuth` and `requireAdmin` are applied **once to the whole admin
router**, not per route. Forgetting to add a guard is a security hole;
forgetting to remove one is merely inconvenient.

| Section | Contents |
| --- | --- |
| Overview | Counts, downloads by format, template popularity (aggregation pipelines) |
| Users | Search, status filter, pagination, CV counts, block/unblock/delete |
| User detail | Their CVs and recent activity |
| CVs | Every CV with its owner; read-only preview; delete |
| Activity | Paginated audit trail |

Two safeguards worth noting: an admin **cannot block or delete their own
account** (that could leave the system unmanageable), and search terms are
**escaped before being used in a regular expression**, so a search for `.*`
is matched literally instead of scanning the collection.

---

## 12. The interface

- **Top bar** — brand, theme switch, who is signed in. Only what belongs
  everywhere, so it stays the same height however much the application grows.
- **Sidebar** — every module, grouped. Navigation moved here from the header
  because the list is long enough that header links would wrap and stop being
  scannable. It becomes a drawer below large screens.
- **Theme** — light, dark or follow-the-system, remembered in `localStorage`
  with every access guarded, since a private window can make storage throw.

### Accessibility

Real `<label htmlFor>` on every field; `aria-invalid` and `aria-describedby`
when a field is in error; `role="alert"` on error messages; a "Skip to
content" link; and all decorative motion dropped under
`prefers-reduced-motion`.

---

## 13. Testing

| Suite | Count | Covers |
| --- | --- | --- |
| Unit | 61 | The import parser, function by function |
| Integration | 68 | Auth, CV ownership, admin access control, health |
| Client | 42 | Routing, guards, all five templates |

Server tests run against an **in-memory MongoDB**, so `npm test` can never
touch development data.

The tests that matter most are the negative ones: a wrong password and an
unknown email returning identical responses, a second user getting 404 for
somebody else's CV, an ordinary user getting 403 from every admin endpoint,
and a blocked account losing access on its next request.

---

## 14. Where things live

```
server/src/
  algorithms/   own code: cvImportParser (+ scorer and matcher in Phase 5)
  config/       env loading, database connection
  controllers/  auth, user, cv, cvExport, admin, review
  middleware/   auth, role, validate, rateLimit, upload, errorHandler
  models/       User, CV, ActivityLog, Review
  routes/       one router per feature, mounted under /api
  services/     tokenService, pdfService, docxService, excelService,
                documentTextService, activityLogger
  utils/        ApiError, apiResponse, asyncHandler, dateFormat

client/src/
  api/          one module per feature, all through the shared Axios instance
  components/   ui/ (Button, TextField, Alert, Spinner, StarRating)
                layout/ (Topbar, Sidebar, Footer, Layout)
                cv/ (preview, forms, import, export, review prompt)
                admin/ home/
  context/      AuthContext, ThemeContext (each split so Fast Refresh works)
  pages/        auth/ user/ admin/ print/
  templates/    the five CV templates and their shared parts
  utils/        useAutosave, reviewSkip
```
