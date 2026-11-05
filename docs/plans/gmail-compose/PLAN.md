# Plan — Connect Gmail and send a tailored cover letter

Status: **in progress**. Stages 1 to 5 are built; stage 6 is not.

| Stage                             | State                                       |
| --------------------------------- | ------------------------------------------- |
| 1 — Credentials and token storage | Built                                       |
| 2 — Connect and disconnect        | Built, and connecting works end to end      |
| 3 — The cover letter composer     | Built                                       |
| 4 — The compose modal             | Built, plus the Cover letter and Mail pages |
| 5 — Draft and send                | Built                                       |
| 6 — Admin, tests, documentation   | Tests and docs done; admin and employer side not |

## 1. What the feature does

A signed-in user (job seeker or employer) connects their own Gmail account once,
from the profile page. Afterwards a **New mail** button opens a split modal:

- **Left:** a live preview of the email exactly as it will appear in Gmail —
  To, Subject, body, signature and the attached CV.
- **Right:** the form — company name, recipient email, job title, an optional
  pasted job description, and a picker listing the user's own CVs.

As soon as a CV and a company name are present the server composes a cover
letter from the CV's own facts, and the preview fills in. The user may edit the
subject and body freely. Two actions close the modal: **Save as draft** (the
default) and **Send now** (behind a confirmation, because the mail is real).

Both actions create the message in the user's _own_ mailbox through the Gmail
API, with the chosen CV attached as a PDF.

## 2. Decisions taken

| Question      | Decision                                                                           |
| ------------- | ---------------------------------------------------------------------------------- |
| Gmail action  | Create a draft, **and** offer "Send now". One scope, `gmail.compose`, covers both. |
| Letter engine | Our own rule-based module. No LLM — CLAUDE.md rules 1 and 2 hold.                  |
| Recipient     | Free-text company name + recipient email typed by the user.                        |
| Attachment    | The chosen CV rendered to PDF by the **existing** `pdfService`.                    |

### Two judgement calls made inside those decisions

1. **An optional "paste the job advert" box is included.** With a free-text
   company and nothing else, the composer can only write a generic letter. When
   a description is pasted, `jobMatcher` supplies the terms the letter should
   lead with, and the letter becomes specific. The field is optional, so the
   feature still works without it.
2. **"Send now" asks for confirmation every time** and names the recipient in
   the dialog. An accidental send during the viva demo cannot be undone.

### Added after stage 2 — the sidebar, and no Inbox

Two sidebar entries were asked for once connecting worked: **Mail** and
**Cover letter**.

- **Cover letter** is stages 3 and 4 as already planned, reached from the
  sidebar as well as from My CVs.
- **Mail** shows **drafts only**. `gmail.compose` allows creating, reading,
  updating and deleting drafts, which covers a Drafts list, but it does not
  allow listing or reading mail, so Inbox and Sent would need
  `gmail.readonly` — a second restricted scope. That was declined: every
  connected user would have to consent again, the profile card's promise
  that "this app cannot read your inbox" would stop being true, and the
  verification problem in section 4 would grow. A Drafts list is what the
  feature needs to show its own work, and nothing more.

## 3. Nothing new is installed

No new npm package, at any stage.

- The OAuth exchange and refresh use `google-auth-library`, already a
  dependency for "Continue with Google".
- The Gmail call itself is a single `fetch` to
  `https://gmail.googleapis.com/gmail/v1/users/me/drafts`, so the large
  `googleapis` client is not needed for one endpoint.
- Refresh tokens are encrypted with `node:crypto` (AES-256-GCM), built in.
- **Puppeteer is not installed by this feature.** It is already in
  `server/package.json` and already drives `GET /cvs/:id/export/pdf`; the
  attachment calls that same `pdfService`. If Chromium is not working on a
  given machine, the modal offers "send without attachment" rather than
  failing, and the DOCX path (`docxService`, no Chromium) stays available.

## 4. What you set up (once, ~20 minutes)

In the **same Google Cloud project** already used for "Continue with Google":

1. **APIs & Services → Library → Gmail API → Enable.**
2. **OAuth consent screen**
   - Add the scope `https://www.googleapis.com/auth/gmail.compose`.
   - Under **Test users**, add every Google account that will be used in the
     demo (your own, and the examiner's if they will click it).
3. **Credentials → Create credentials → OAuth client ID → Web application**
   - Authorised redirect URI: `http://localhost:5000/api/gmail/callback`
     (and the HTTPS form if `HTTPS_ENABLED` is on).
   - Download the `client_secret_….json`. Unlike sign-in, this flow needs the
     **client secret**.
4. Run `npm run setup:gmail -- "<path to client_secret_….json>"` (added in
   stage 1). It writes the keys below into `server/.env`:

```
GOOGLE_CLIENT_SECRET=...        # from the downloaded JSON
GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmail/callback
GMAIL_TOKEN_KEY=...             # 32-byte random key, generated by the script
```

`GOOGLE_CLIENT_ID` is already set and is reused.

### Limitation to record in the report

`gmail.compose` is a Google **restricted scope**. While the consent screen is
in _Testing_ mode it works for up to 100 named test users with no verification,
which is everything the project and the viva need. A public launch would need
Google's verification review plus a CASA security assessment. This goes in
`docs/implementation-notes.md` as a stated limitation, not hidden.

## 5. Stages

Each stage ends with a summary, the file list, how to run it, and a stop for
approval (CLAUDE.md rule 3).

### Stage 1 — Credentials and token storage

- `server/scripts/setupGmail.js` + `npm run setup:gmail`, modelled on the
  existing `setup:google` script.
- `server/src/config/env.js`: `gmail: { clientSecret, redirectUri, tokenKey }`.
  Empty values switch the whole feature off, exactly as `googleClientId` does.
- `server/src/models/GmailAccount.js` — `user` (ref, unique), `email`,
  `refreshTokenCipher`, `iv`, `authTag`, `scope`, `connectedAt`, `lastUsedAt`.
  The refresh token is never stored or returned in plain text; access tokens
  are held in memory only.
- `server/src/services/gmailOAuthService.js` — build the consent URL, exchange
  the code, encrypt/decrypt the refresh token, mint a fresh access token,
  revoke on disconnect.
- Unit tests for the encrypt/decrypt round trip.

### Stage 2 — Connect and disconnect

- `GET /api/gmail/connect` → redirects to Google (`access_type=offline`,
  `prompt=consent`, signed `state` tied to the session to stop CSRF).
- `GET /api/gmail/callback` → stores the account, redirects back to the profile
  page with a success or failure flag.
- `GET /api/gmail/status` → `{ connected, email, connectedAt }`.
- `DELETE /api/gmail/disconnect` → revokes at Google and deletes the record.
- `client/src/pages/user/ProfilePage.jsx`: a "Connected accounts" card showing
  Connect / the connected address + Disconnect. Hidden when the server reports
  the feature is not configured.
- `ActivityLog` gains `GMAIL_CONNECT` and `GMAIL_DISCONNECT`.
- Integration tests with the Google calls stubbed.

### Stage 3 — The cover letter composer (the algorithmic part)

- `server/src/algorithms/coverLetterComposer.js`, pure functions, no I/O,
  heavily commented for the viva. Structure:
  1. Gather facts from the CV — name, headline, years from the experience
     dates, top skills, one quantified achievement, highest qualification,
     most relevant project.
  2. If a job description was pasted, run the existing `textProcessor` and
     `jobMatcher` over it and keep the matched terms, ranked.
  3. Fill four fixed paragraph skeletons: opening (role + company + where the
     interest comes from), evidence (two achievements, verb-first via
     `phraseRewriter`), fit (matched skills in the advert's own spelling),
     close (availability + thanks).
  4. Compose the subject line and the sign-off.
  5. Return `{ subject, body, usedFacts, notes }` — `notes` says what could not
     be evidenced, e.g. "no quantified achievement found", instead of the
     module inventing one.
- `server/src/config/coverLetterConfig.js` — every skeleton, connective phrase
  and length threshold in one file, so it can be explained and adjusted.
- `POST /api/cover-letters/preview` `{ cvId, companyName, jobTitle, jobDescription? }`.
- Unit tests: a full CV, a sparse CV, a CV with no quantified result, with and
  without a job description.

### Stage 4 — The compose modal

- `client/src/components/mail/ComposeMailModal.jsx` — split layout, stacking on
  mobile; `EmailPreview.jsx` on the left; the form on the right.
- Debounced regeneration (~600 ms) when the CV, company or advert changes, plus
  a manual **Regenerate** button.
- Subject and body are editable; editing stops the debounce from overwriting
  the user's words, and the Regenerate button warns before discarding edits.
- Validation: recipient email format, company name required, a CV selected.
- Loading, empty and error states; "Gmail not connected" sends the user to the
  profile card instead of failing silently.
- Entry points: the My CVs dashboard and the seeker dashboard.

### Stage 5 — Draft and send

- `server/src/services/mimeBuilder.js` — RFC 2822 `multipart/mixed`, correct
  encoding for non-ASCII subjects and names, base64url for the Gmail body.
- `POST /api/gmail/drafts` `{ cvId, to, subject, body, attachCv }` → renders
  the PDF via the existing `pdfService`, builds the MIME message, creates the
  draft, returns the draft id and a deep link to it in Gmail.
- `POST /api/gmail/send` — the same, then sends. Requires an explicit
  `confirm: true` in the body as well as the dialog in the UI.
- Rate limited per user (reuse `middleware/rateLimit.js`).
- `ActivityLog` gains `GMAIL_DRAFT` and `GMAIL_SEND`, with the company name and
  CV in `meta` (never the letter body).
- Progress state in the modal — the PDF render costs a few seconds.

### Stage 6 — Admin, tests, documentation

- Admin dashboard: connected-Gmail count, drafts and sends per month, and the
  companies most often written to; a `gmail` report type in
  `GET /admin/reports/:type` with Excel and PDF export.
- Employer side: the same modal, reachable from an application, pre-addressed
  to the applicant, with an interview-invitation skeleton instead of a cover
  letter.
- Integration tests for every route, including the refusals (not connected,
  not the owner of the CV, feature not configured).
- `docs/algorithms.md` — the composer's pseudocode, flowchart and a worked
  example; `docs/implementation-notes.md` — the OAuth flow and the restricted
  scope limitation; `docs/test-cases.md` — new unit and system rows;
  `docs/diagrams/` — a sequence diagram for connect → compose → draft → send;
  `CLAUDE.md` — new routes, model, activity actions and the `setup:gmail`
  command.

## 6. Risks

| Risk                                         | Handling                                                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| "Send now" mails a real company by mistake   | Confirmation dialog naming the recipient, plus `confirm: true` server-side. Draft is the default action.                                        |
| Restricted scope blocks a public launch      | Testing mode covers the project; limitation documented.                                                                                         |
| No internet, or Google down, during the viva | The composer and the preview work with no Gmail connection at all, so the algorithm — the part that carries marks — can always be demonstrated. |
| Refresh token leaking from the database      | Encrypted at rest with a key held only in `.env`; never returned by any endpoint.                                                               |
| PDF render makes the draft call slow         | Progress state in the modal; the existing 5-second budget already applies.                                                                      |
