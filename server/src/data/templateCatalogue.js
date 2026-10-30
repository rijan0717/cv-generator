/**
 * The catalogue entry for every template the client can render.
 *
 * It mirrors `client/src/templates/index.js`, which holds the same keys,
 * names and descriptions beside the components themselves. The duplication
 * is on purpose and in one direction only: the client is the authority on
 * what can be *drawn*, this file is what seeds the database so the admin
 * has something to activate and deactivate.
 *
 * Adding a template means three edits: the component and registry entry in
 * the client, the key in `TEMPLATE_KEYS`, and a line here. The seed script
 * is then re-run, and `npm run seed:templates` is safe to repeat.
 */
export const TEMPLATE_CATALOGUE = [
  {
    key: 'classic',
    name: 'Classic',
    description: 'Single column with a centred header and ruled headings. Traditional and safe.',
    usesPhoto: false,
  },
  {
    key: 'modern',
    name: 'Modern',
    description: 'Two columns with a coloured sidebar for your photo, contact details and skills.',
    usesPhoto: true,
  },
  {
    key: 'minimal',
    name: 'Minimal',
    description: 'Lots of whitespace and light section labels. The photo is optional.',
    usesPhoto: true,
  },
  {
    key: 'creative',
    name: 'Creative',
    description: 'A bold coloured header band with icons for your contact details.',
    usesPhoto: true,
  },
  {
    key: 'ats',
    name: 'ATS-Friendly',
    description:
      'Plain single column, no graphics or colour. Built to be read correctly by screening software.',
    usesPhoto: false,
  },
  {
    key: 'executive',
    name: 'Executive',
    description:
      'Wide-tracked name over a rule, with contact details, education and skills in a rail beside your career history.',
    usesPhoto: false,
  },
  {
    key: 'banner',
    name: 'Banner',
    description:
      'Centred two-tone name above a full-width contact band, then ruled sections and skills in two columns.',
    usesPhoto: false,
  },
  {
    key: 'monogram',
    name: 'Monogram',
    description:
      'An initials badge beside a widely spaced name, with contact details stacked in the top right.',
    usesPhoto: false,
  },
  {
    key: 'formal',
    name: 'Formal',
    description:
      'Centred upper-case name and one contact line, with key skills running in three columns.',
    usesPhoto: false,
  },
  {
    key: 'editorial',
    name: 'Editorial',
    description:
      'A large left-aligned name, spaced capitals for your role, and generous space between sections.',
    usesPhoto: false,
  },
  {
    key: 'compact',
    name: 'Compact',
    description: 'Tight spacing and small headings, for a long history that still has to fit.',
    usesPhoto: false,
  },

  // --- Produced by the template engine (client/src/templates/engine) ------
  // These mirror DESIGNS in designs.js rather than a component file, but
  // the catalogue cannot tell the difference and does not need to.
  {
    key: 'civic',
    name: 'Civic',
    description:
      'Plain single column in black on white, with ruled headings and no graphics. Built to be read by screening software.',
    usesPhoto: false,
  },
  {
    key: 'granite',
    name: 'Granite',
    description:
      'A quiet side column divided by a rule, with widely spaced headings in a serif face. Sober and unhurried.',
    usesPhoto: false,
  },
  {
    key: 'ember',
    name: 'Ember',
    description:
      'A warm full-width header band carrying your photo and contact details, over underlined headings.',
    usesPhoto: true,
  },
  {
    key: 'scholar',
    name: 'Scholar',
    description:
      'Centred name and ruled headings in a classical serif, with skills in two columns. For academic and research posts.',
    usesPhoto: false,
  },
  {
    key: 'orbit',
    name: 'Orbit',
    description:
      'A coloured header band over a timeline, with each role marked on a line down the page and skills shown as dots.',
    usesPhoto: true,
  },
  {
    key: 'paper',
    name: 'Paper',
    description:
      'Warm grey on white with small, widely spaced headings and nothing else. Plain, roomy and quiet.',
    usesPhoto: false,
  },
  {
    key: 'vector',
    name: 'Vector',
    description:
      'A solid colour side panel holding your photo, name and skill bars, with condensed headings beside it.',
    usesPhoto: true,
  },
  {
    key: 'beacon',
    name: 'Beacon',
    description:
      'A centred plain-text layout in black on white, with no columns or graphics. A second ATS-safe option.',
    usesPhoto: false,
  },
  {
    key: 'cascade',
    name: 'Cascade',
    description:
      'A wide, lightly tinted side column for your photo and skills, with each skill level written out in words.',
    usesPhoto: true,
  },
  {
    key: 'folio',
    name: 'Folio',
    description:
      'Your name opposite your contact details, a coloured corner, and centred headings between rules.',
    usesPhoto: true,
  },
  {
    key: 'sterling',
    name: 'Sterling',
    description:
      'Name opposite your contact details, with a ruled side column on the right for skills and languages.',
    usesPhoto: false,
  },
  {
    key: 'juniper',
    name: 'Juniper',
    description:
      'A lightly tinted column on the right, with headings on a tinted strip and skills shown as dots.',
    usesPhoto: false,
  },
  {
    key: 'marquee',
    name: 'Marquee',
    description:
      'A coloured stripe along the top edge, your photo beside the name, and headings set in filled blocks.',
    usesPhoto: true,
  },
  {
    key: 'linden',
    name: 'Linden',
    description:
      'Centred and unhurried, with small spaced headings and skills as a single plain line.',
    usesPhoto: false,
  },
  {
    key: 'cobalt',
    name: 'Cobalt',
    description:
      'A solid blue panel on the right carrying your photo, name and skill bars, with underlined headings beside it.',
    usesPhoto: true,
  },
  {
    key: 'chancery',
    name: 'Chancery',
    description:
      'A formal centred layout with headings between rules and skills in two columns. For law, policy and the public sector.',
    usesPhoto: false,
  },
  {
    key: 'meadow',
    name: 'Meadow',
    description:
      'A stripe down the edge of the page and a timeline through your history, with barred headings.',
    usesPhoto: true,
  },
  {
    key: 'prism',
    name: 'Prism',
    description:
      'Your name opposite stacked contact details, over tinted heading strips and skill levels written in words.',
    usesPhoto: false,
  },
  {
    key: 'keystone',
    name: 'Keystone',
    description:
      'A wide, undecorated side column divided by a rule, with ruled headings. Plain and roomy for a long history.',
    usesPhoto: false,
  },
];
