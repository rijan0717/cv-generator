# Template gallery and 50+ templates — plan

Status: **step 1 done; steps 2–6 waiting.** Written 2026-10-29 so the work can resume
without re-deciding anything.

## 1. Goal

Offer around 50 distinct CV templates in a clean grid gallery with live previews, so a
user can pick a layout that suits the job they are applying for. The gallery must look
and feel like this project, not like Canva.

Why it is worth doing (for the report and viva):

- **User value:** a designer, an accountant and a fresher need different CVs; categories
  (ATS-friendly, professional, modern, creative, simple) let them find one quickly.
- **Own module:** the templates are produced by our own engine — "a template is data plus
  one renderer" — not by a template library or plugin (CLAUDE.md rule 1).
- **No PDF risk:** templates are React components read through the same CSS variables,
  so the Puppeteer export already matches the preview for every one of them.

## 2. Decisions already made (do not re-ask)

| Question                  | Decision                                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts                     | Curated list expanded from 6 to **12** Google Fonts, plus a separate **heading font**.                                                                                                                                        |
| Where the grid appears    | **Both**: a `/templates` page, and the editor's Design tab.                                                                                                                                                                   |
| What thumbnails show      | A **sample CV** (`client/src/templates/sampleCV.js`); the editor can switch to "my CV".                                                                                                                                       |
| How the work is reviewed  | **Engine first, then batches of about 10**, each reviewed before the next.                                                                                                                                                    |
| The existing 11 templates | **Kept as hand-written components.** Not rewritten onto the engine: they already export correctly, and rewriting risks changing PDFs people have downloaded.                                                                  |
| Reference PDF             | Kept locally at `reference/canva-template-grid-2026-10-29.pdf`, **git-ignored**: 15 MB of Canva's designs, which are not ours to republish. Use it only to judge how much variety a gallery needs, never as a source to copy. |

## 3. Step 1 — gallery for the existing 11 (done)

Built on branch `feat/template-gallery`:

- `client/src/templates/index.js` — each template has a `category` and `isTwoColumn`;
  `CATEGORIES` lists the gallery chips.
- `client/src/templates/sampleCV.js` — the invented CV (Anisha Thapa) every thumbnail
  renders, with an inline SVG photo so nothing needs licensing.
- `client/src/components/templates/`
  - `TemplateThumbnail.jsx` — the real template at A4 size, shrunk with
    `transform: scale()`; draws only when near the viewport (`IntersectionObserver`).
  - `TemplateGallery.jsx` — search, category chips with counts, "With photo",
    "Two columns", "Preview with my CV"; the caller decides what a click does.
  - `TemplatePreviewDialog.jsx` — native `<dialog>` with a large preview and
    "Use this template".
  - `useOfferedTemplates.js` — registry filtered to what the admin has left active.
- `client/src/pages/user/TemplatesPage.jsx` + route `/templates` + sidebar link.
- Design tab (`CustomisePanel.jsx`) — the radio list is replaced by the compact gallery;
  "Heading font" select added.
- Fonts: `FONT_STACKS` in `templateUtils.js` and the Google Fonts link in
  `client/index.html` (Poppins, Montserrat, Raleway, Lora, EB Garamond, Oswald added);
  `--cv-heading-font` variable; `.cv-ats` keeps Arial for its headings.
- Server: `settings.headingFont` in `server/src/models/CV.js`.
- Tests: registry categories, client/server catalogue keys match, heading font fallback,
  sample CV, and `TemplateGallery.test.jsx`.

## 4. Step 2 — the template engine

Move `engine-draft.jsx` (this folder) to
`client/src/templates/engine/DesignedTemplate.jsx` and write `engine.css` beside it.

**How it works.** A design is a plain object of choices. `DesignedTemplate` turns any
design into a CV, writing each choice onto the page as a `data-` attribute; `engine.css`
has one block of rules per choice. `makeDesignedTemplate(design)` wraps a design as an
ordinary template component, so the registry, preview, print page and PDF treat it like
a hand-written one.

| Option         | Values                                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| `layout`       | `single`, `sidebar-left`, `sidebar-right`, `timeline`                        |
| `header`       | `left`, `centered`, `split`, `band`, `panel` (name and photo in the sidebar) |
| `heading`      | `rule`, `underline`, `bar`, `chip`, `spaced`, `ornament`, `band`, `dot`      |
| `photo`        | `circle`, `rounded`, `square`, `none`                                        |
| `sidebarTone`  | `solid`, `tint`, `plain`                                                     |
| `sidebarWidth` | `narrow` (~62mm), `wide` (~80mm)                                             |
| `contact`      | `inline`, `icons`, `stacked`, `stacked-icons`                                |
| `accent`       | `none`, `top-stripe`, `side-stripe`, `corner`                                |
| `nameSize`     | `md`, `lg`, `xl`                                                             |
| `nameCase`     | `normal`, `upper`                                                            |
| `skills`       | `pills`, `plain`, `levelled`, `columns`, `bars`, `dots`                      |
| `labels`       | optional heading overrides, e.g. `{ summary: 'Profile' }`                    |

A design also carries `defaults` — `primaryColor`, `backgroundColor`, `textColor`,
`fontFamily`, `headingFont` — applied when the template is chosen, because a palette
and font pairing are part of what makes one template different from the next.

**Rules the engine must keep (learned from the existing templates):**

1. **Sidebar colour on page 2.** A flex column paints only its own height in print. Do
   what `.cv-modern` does: in `@media print` paint the stripe with a
   `linear-gradient` on `.cv-page` and make the aside transparent. Width and colour come
   from CSS variables set per `data-width` / `data-tone`.
2. **Never put a full-width header above a sidebar layout** (the stripe would show
   behind it). The header goes in the main column, in the sidebar (`panel`), or is a
   `band` with its own opaque background. `DesignedTemplate` already enforces this.
3. **Accents are decoration only:** absolutely positioned inside `.cv-page`
   (`position: relative`), `aria-hidden`, and never carrying text.
4. **Break rules:** add every new header class to the `break-inside: avoid` list in the
   print block of `templates.css`; `.cv-entry` must not split; headings `break-after: avoid`.
5. **Dark sidebars:** headings, dates, pills, meters and links need white or
   `rgba(255,255,255,…)` overrides under `[data-tone='solid']`, as `.cv-modern .cv-sidebar` has.
6. **`sr-only` inside scroll panes** needs a positioned ancestor (see commit a78fef4).

Shared parts to add back (removed from step 1 because nothing used them yet):

- `SkillList` variants `bars` and `dots`, with `SKILL_LEVELS` and
  `skillLevelStep(level)` (Beginner 1 … Expert 4; no level counts as 2) in `templateUtils.js`,
  and `.cv-skill-meters` / `.cv-meter-*` / `.cv-dot*` CSS driven by
  `--cv-meter-track` and `--cv-meter-fill`.
- Move `ICONS` and `ContactItem` from `CreativeTemplate.jsx` into `TemplateParts.jsx`
  (exported as `CONTACT_ICONS` / `ContactItem`) so the engine can draw icon contacts.

Choosing a template must then apply its `defaults`: in the Design tab
`onChange({ templateKey, settings: { ...settings, ...template.defaults } })`; on the
Templates page pass them to `createCV` (extend `POST /api/cvs` to accept a whitelisted
`settings` object). Give the existing 11 sensible `defaults` too (their current look:
slate palette, Inter) so switching back to them is predictable.

## 5. Steps 3–6 — the templates, in batches

Each batch: about 10 design objects in `client/src/templates/engine/designs.js`, one
registry entry each (generated from the designs), the keys appended to `TEMPLATE_KEYS`
in `server/src/models/CV.js` (append only — a CV stores its key), one catalogue line
each in `server/src/data/templateCatalogue.js`, then `npm run seed:templates`.

Proposed designs (names are ours; adjust freely, but keep every one visibly different
from its neighbours — vary at least two of layout, header, heading and palette):

| #     | Name     | Category     | Layout / header                                                                                                                                                            | Heading   | Photo   | Skills   | Palette / fonts                |
| ----- | -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- | -------- | ------------------------------ |
| 1     | Meridian | professional | sidebar-right tint, left                                                                                                                                                   | rule      | none    | plain    | navy · Lora / Source Sans 3    |
| 2     | Summit   | modern       | sidebar-left solid, panel                                                                                                                                                  | spaced    | circle  | bars     | charcoal · Montserrat / Inter  |
| 3     | Ledger   | professional | timeline, split                                                                                                                                                            | rule      | none    | columns  | graphite · Source Sans 3       |
| 4     | Harbour  | modern       | band + sidebar-left tint                                                                                                                                                   | bar       | rounded | dots     | teal · Poppins / Lato          |
| 5     | Quill    | professional | single, centered                                                                                                                                                           | ornament  | none    | plain    | ink · EB Garamond              |
| 6     | Pulse    | creative     | single, left, side-stripe                                                                                                                                                  | chip      | circle  | pills    | coral · Poppins                |
| 7     | Atlas    | modern       | sidebar-right plain wide, split                                                                                                                                            | underline | none    | levelled | blue · Raleway / Inter         |
| 8     | Fresher  | simple       | single, left                                                                                                                                                               | band      | none    | pills    | green · Lato                   |
| 9     | Nova     | creative     | band, corner accent                                                                                                                                                        | dot       | circle  | dots     | violet · Oswald / Inter        |
| 10    | Civic    | ats          | single, left                                                                                                                                                               | rule      | none    | plain    | black · Arial-like (Inter)     |
| 11    | Granite  | professional | sidebar-left plain, left                                                                                                                                                   | spaced    | none    | plain    | stone · Merriweather / Lato    |
| 12    | Lagoon   | modern       | sidebar-right solid, panel                                                                                                                                                 | chip      | circle  | bars     | deep teal · Poppins            |
| 13    | Ember    | creative     | band, top-stripe                                                                                                                                                           | underline | rounded | pills    | burnt orange · Montserrat      |
| 14    | Scholar  | professional | single, centered                                                                                                                                                           | rule      | none    | columns  | maroon · EB Garamond / Lora    |
| 15    | Orbit    | modern       | timeline, band                                                                                                                                                             | dot       | circle  | dots     | indigo · Raleway               |
| 16    | Paper    | simple       | single, left                                                                                                                                                               | spaced    | none    | plain    | warm grey · Lora               |
| 17    | Vector   | creative     | sidebar-left solid, panel                                                                                                                                                  | bar       | square  | bars     | black + lime · Oswald / Inter  |
| 18    | Beacon   | ats          | single, centered                                                                                                                                                           | rule      | none    | plain    | black · Source Sans 3          |
| 19    | Cascade  | modern       | sidebar-left tint wide, left                                                                                                                                               | underline | rounded | levelled | sky · Lato                     |
| 20    | Folio    | creative     | single, split, corner                                                                                                                                                      | ornament  | circle  | pills    | rose · Playfair Display / Lato |
| 21–50 | —        | mix          | further combinations in the same spirit; keep the category counts roughly even (about 12 professional, 12 modern, 10 creative, 8 simple, 6 ATS-friendly over the full 61). |

ATS-friendly designs must keep the rules of `AtsTemplate`: single column, no photo,
no icons, no pills or meters, plain headings, black text.

## 6. Server and admin work that 50+ templates need

- `GET /api/templates` returns only templates with an active database row, so a new
  template is hidden until `npm run seed:templates` runs. Make it also offer catalogue
  entries **with no row yet** (treat "never seeded" as active), while a row the admin
  switched off stays hidden. Admin list: report how many catalogue entries are unseeded.
- Add `category` to the `Template` model, the catalogue and `toJSON`, so the admin can
  filter by it.
- `AdminTemplatesPage.jsx`: search, category filter and pagination (CLAUDE.md §11 —
  pagination on all admin lists); 60 rows is too many for one page.
- Consider a thumbnail on each admin row (reuse `TemplateThumbnail`).

## 7. Performance checks before each batch is approved

- 60 live thumbnails: they draw lazily, but measure scroll smoothness on the Templates
  page and the Design tab. If it stutters, cap the first render at 12 and add
  "Show more", or draw each thumbnail once to a cached `<img>` via `canvas`-free
  approaches (no new dependency without asking).
- PDF export under ~5 seconds for a 2-page CV in every new template (CLAUDE.md §11).
- Every template: multi-page sample prints with the sidebar colour on page 2 and no
  entry split across sheets.

## 8. Tests to add with the engine

- Every design uses only values listed in `DESIGN_OPTIONS` (catches typos).
- No two designs are identical in layout + header + heading + defaults.
- Each engine template passes the existing `describe.each(TEMPLATES)` suite in
  `templates.test.jsx` automatically (name, sections, hidden section, placeholder name).
- ATS designs render no `img`, `.cv-pill`, meter or icon.
- Client registry keys still equal the server catalogue keys (test exists).

## 9. Documentation to update when finished

- `CLAUDE.md` §5.3 (number of templates, 12 fonts, heading font), §6 (Template
  `category`), §12 if a command changes.
- `docs/implementation-notes.md` — the engine, the gallery, the sample CV.
- `docs/algorithms.md` is not affected (no algorithm here).
- `docs/test-cases.md` — the new unit tests and a system test: "choose a template from
  the gallery, edit, download PDF".
- `docs/tools-used.md` — the six added Google Fonts.
- Diagrams: add the gallery to the "CV creation to download" activity diagram.

## 10. Effort estimate

| Step                                | Rough time         |
| ----------------------------------- | ------------------ |
| 2 — engine, defaults, shared parts  | 1.5–2 hours        |
| 3–6 — four batches of ~10 templates | 45–60 minutes each |
| Server/admin work (§6)              | about 1 hour       |
| Docs (§9)                           | about 30 minutes   |
