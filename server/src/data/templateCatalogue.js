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
];
