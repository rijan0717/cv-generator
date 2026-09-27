# UI Redesign Specification

Design work agreed but **not yet built**. Three separate pieces, each based
on a reference the client supplied. This document is the brief; nothing here
is implemented unless a section says otherwise.

| Piece | Reference | Status |
| --- | --- | --- |
| 1. CV editor and customise page | Screenshot of a commercial resume builder | Not started |
| 2. Home page | resume.io style landing page | Not started |
| 3. CV templates | Two of the client's own CV PDFs | CSS drafted, components not written |

> The references are commercial products. They are a guide to **layout and
> information hierarchy**, not something to copy. No branding, wording,
> imagery or paid-tier mechanics are to be reproduced.

---

## 1. CV editor and customise page

### 1.1 Overall frame

A two-pane workspace. Controls on the left, the live CV preview on the
right, with a mode switch above both.

```
┌──────────────────────────────────────────────────────────────┐
│                    [  Edit  |  Customize  ]                  │  mode switch
├───────────────────────────────┬──────────────────────────────┤
│  Template & Colors │ Text │ Layout  │                        │
│  ───────────────────                │                        │
│                               │                              │
│   Main color  ● ○ ○ ○ ○       │        live A4 preview       │
│                               │                              │
│   [All][With photo][Two col]  │                              │
│   [ATS][DOCX][Customizable]   │                              │
│                               │                              │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐ │                              │
│   │card│ │card│ │card│ │card│ │            ‹ 1/1 ›           │
│   └────┘ └────┘ └────┘ └────┘ │                              │
└───────────────────────────────┴──────────────────────────────┘
```

### 1.2 Mode switch

A centred segmented control with two options, **Edit** and **Customize**.
This replaces the current Content / Design tabs, which sit above the left
column only. Moving it to the top centre makes it read as a mode for the
whole workspace rather than a filter on one panel.

- Active segment: white pill on a light grey track, subtle shadow.
- Inactive: grey text, no fill.

### 1.3 Customise panel tabs

Three underlined tabs across the top of the left pane:

| Tab | Contains |
| --- | --- |
| **Template & Colors** | Main colour swatches, template filters, template gallery |
| **Text** | Font family, size, line height, heading style |
| **Layout** | Spacing, margins, section order and visibility, column split |

Active tab: coloured text with a 2px underline in the accent colour.
Inactive: grey, no underline.

This splits today's single long customisation panel into three, which is the
main reason the current one feels cramped: template, typography and layout
are unrelated concerns scrolling past each other.

### 1.4 Main colour row

A label "Main color" followed by a row of circular swatches. The selected
one shows a white tick.

The reference locks all but the first swatch behind a padlock, because it is
a paid product. **We do not have tiers — every colour is available and no
padlock is ever shown.** Keep the row, drop the gating.

Behaviour:

- Swatches are the theme presets already in `CustomisePanel`.
- The last item is a custom colour well opening the native colour picker.
- Selecting a swatch sets `settings.primaryColor` and derived tones.

### 1.5 Template filter chips

A wrapping row of pill buttons that filter the gallery below. Active chip is
filled in a pale accent with a coloured border; inactive is white with a grey
border.

Chips to support, given our data:

| Chip | Filter |
| --- | --- |
| All | no filter (default) |
| With photo | `usesPhoto === true` |
| Two column | templates with a sidebar layout |
| ATS | the ATS-friendly template |
| Simple | single column, no colour blocks |

Dropped from the reference: **DOCX**, **Experts**, **Customizable** and
**Free**. Every one of our templates exports to DOCX, every one is
customisable, all are free, and we have no expert-authored tier — chips that
never exclude anything are noise.

`TEMPLATES` in `client/src/templates/index.js` gains a `tags: string[]` field
so the chips are data-driven rather than hard-coded.

### 1.6 Template gallery

A responsive grid of cards, roughly four across at full width, two on
tablet, one on mobile.

Each card:

- **Name above the thumbnail**, centred, medium weight.
- **Thumbnail**: the real template rendered at A4 and scaled down, exactly as
  `FloatingTemplates` already does on the home page. Not a screenshot — a
  screenshot goes stale the moment a template changes.
- **Selected state**: 2px accent border plus a filled circular tick badge
  over the thumbnail.
- **Format badges** bottom-right of the thumbnail: small `PDF` and `DOCX`
  labels.

On the badges: in the reference they advertise which formats a template
supports. Ours all support both, so they are decoration rather than
information. **Either drop them, or keep them as a quiet reassurance.**
Recommend dropping — a badge that is always the same teaches the user
nothing. Decide before building.

Cards must be real `<button>`s or labelled radio inputs, not clickable
`div`s, so the gallery is keyboard-navigable and announces the selected
template.

### 1.7 Preview pane

- Light grey backdrop, the page floating on it with a soft shadow.
- **Page pager** at the bottom centre: a dark rounded pill with a previous
  arrow, `current / total`, and a next arrow.

The pager is new work, not just styling. The preview currently renders one
continuous element and does not know about page boundaries. Paginating means
measuring rendered height against the A4 content box and splitting, which is
the same problem the PDF export already solves by delegating to the browser.
Options, cheapest first:

1. Show the page count only once known from the PDF, and keep scrolling.
2. Render a CSS multi-page preview using fixed-height page containers.
3. Measure and reflow in JavaScript.

Recommend (1) initially. (3) is a genuinely hard problem and not worth it for
an academic project.

---

## 2. Home page

Reference: a resume.io style long-form landing page. Sections top to bottom:

1. **Hero** — headline, subheading, two calls to action, and a cluster of
   template previews fanned out to the right.
2. **Logo strip** — "as used by" style row. **Skip this.** We have no such
   users and inventing logos would be dishonest.
3. **Feature explainer** — a screenshot or short loop beside explanatory
   copy, with three supporting points underneath.
4. **Template showcase band** — full-width coloured band, heading, a few
   template previews and a rating summary.
5. **Alternating feature rows** — image left / text right, then reversed,
   for: edit and customise online, pre-generated content, export to multiple
   formats, job tracking.
6. **Testimonials** — rating summary and a row of review cards. *We already
   have this*, fed by real reviews above three stars.
7. **How to build a resume** — numbered steps with an illustration column.
8. **Closing call to action** — coloured band with a large heading.
9. **Pricing** — **skip entirely.** The application is free and has no tiers.

Palette: a strong indigo/violet primary with generous white space, one
coloured band roughly every third section to break up the length.

Everything shown must be real: template previews render the actual
components, testimonials come from the database, and any counter reflects a
genuine query. No invented user numbers.

---

## 3. CV templates

Rebuild around two reference CVs the client supplied. Both are single
column, print first, and considerably more professional than the current
set.

### 3.1 Executive

From the first reference PDF.

- Name centred, uppercase, wide letter spacing (~0.3em), navy.
- Role line beneath in smaller spaced uppercase.
- Contact on two centred lines, `·` separated, links underlined.
- Section headings: small spaced uppercase in the accent colour with a
  full-width rule beneath.
- Experience: **company — location** bold left, **dates** bold right; role in
  italic beneath; then bullets.
- Skills, Education and Languages as a **label/value table**: narrow bold
  label column, wide value column.

### 3.2 Accent

From the second reference PDF.

- Large bold name in the accent colour, centred.
- Contact row with `•` separators.
- Section headings in the accent colour, left aligned, with a rule above.
- Summary justified.
- Company bold left, dates bold right, role bold beneath, then bullets.

### 3.3 The skills table problem

The Executive reference groups skills under custom category headings —
"Automation", "API testing", "Test management". **Our CV model has no such
field**: a skill is `{ name, level }`.

Three options:

1. **Group by level** (Expert / Advanced / Intermediate / Beginner) as the
   label column. Uses existing data, no migration, and still gives the
   two-column look.
2. **Add an optional `category` field** to the skill sub-document. Matches
   the reference exactly, but means a schema change, a builder field, and
   handling CVs that have none.
3. Render skills as one wrapped line, as now.

Recommend (1) for the first cut and (2) later if the grouping proves useful.
**This needs a decision before the Executive template can be finished.**

### 3.4 Current state — important

`client/src/templates/templates.css` **has already been rewritten** for these
designs and is uncommitted. It defines `.cv-executive` and `.cv-accent`, and
no longer defines `.cv-classic` or `.cv-modern`, which the existing
components still use.

So the working tree is inconsistent: **templates will render unstyled until
the components are rewritten or the stylesheet is reverted.**

```bash
# revert and carry on with the old templates
git checkout -- client/src/templates/templates.css
```

Registry keys (`classic`, `modern`, `minimal`, `creative`, `ats`) are stored
on every CV document, so they must not be removed. Keep the keys and change
what they render and how they are described:

| Key | Becomes |
| --- | --- |
| `classic` | Executive |
| `modern` | Accent |
| `minimal` | Minimal, refined |
| `creative` | Sidebar with photo |
| `ats` | ATS-friendly, unchanged |

---

## 4. Open decisions

Each of these blocks part of the work:

1. **Format badges** on template cards — keep or drop? (Recommend drop.)
2. **Skills grouping** — by level, or add a `category` field? (Recommend by
   level first.)
3. **Preview pagination** — page count only, or a true multi-page preview?
   (Recommend page count only.)
4. **`templates.css`** — revert now, or leave dirty until the components are
   written?

---

## 5. Suggested order

The template rebuild is the highest value: it is what a viva examiner and a
real user both look at first, and the editor redesign is mostly a rearrange
of controls that already work.

1. Templates — Executive and Accent, then the remaining three.
2. Editor — mode switch, the three tabs, filter chips, gallery cards.
3. Home page — section by section, skipping the logo strip and pricing.

None of this is Phase 5. The **CV Strength Score** and **CV–Job Match
Analyser** remain unstarted and are the part the university guideline
actually marks, so they should not be deferred behind all of the above.
