/**
 * The template registry.
 *
 * Everything that needs to know about templates — the picker, the preview,
 * the print page — reads this one list, so adding a sixth template means
 * writing the component and adding one entry here.
 */
import ClassicTemplate from './ClassicTemplate.jsx';
import ModernTemplate from './ModernTemplate.jsx';
import MinimalTemplate from './MinimalTemplate.jsx';
import CreativeTemplate from './CreativeTemplate.jsx';
import AtsTemplate from './AtsTemplate.jsx';
import ExecutiveTemplate from './ExecutiveTemplate.jsx';
import BannerTemplate from './BannerTemplate.jsx';
import MonogramTemplate from './MonogramTemplate.jsx';
import FormalTemplate from './FormalTemplate.jsx';
import EditorialTemplate from './EditorialTemplate.jsx';
import CompactTemplate from './CompactTemplate.jsx';
import { DESIGNS } from './engine/designs.js';
import { makeDesignedTemplate } from './engine/DesignedTemplate.jsx';
import './templates.css';

/**
 * @typedef {object} TemplateDefinition
 * @property {string} key - Matches `templateKey` on the CV document.
 * @property {string} name - Shown in the picker.
 * @property {string} description - One line explaining when to use it.
 * @property {string} category - One of the CATEGORIES keys, for the gallery filter.
 * @property {boolean} isTwoColumn - Whether the body is split into two columns.
 * @property {boolean} usesPhoto - Whether this template renders the photo.
 * @property {object} [defaults] - Palette and fonts applied when it is chosen.
 * @property {React.ComponentType<{cv: object}>} Component - The renderer.
 */

/**
 * The palette and fonts the first eleven templates were designed against.
 *
 * They had no `defaults` of their own because they were written before the
 * engine, and every design now carries a palette. Without this, switching
 * from a designed template back to Classic would leave Classic wearing the
 * other one's colours, which reads as a bug rather than as a choice.
 */
const ORIGINAL_DEFAULTS = {
  primaryColor: '#0f172a',
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  fontFamily: 'Inter',
  headingFont: 'Inter',
};

/**
 * The groups the template gallery filters by, in the order its chips are
 * shown. Each template belongs to exactly one, chosen by what it is best
 * for rather than how it looks, because that is the question a user is
 * actually asking: "which of these suits the job I am applying for?"
 */
export const CATEGORIES = [
  {
    key: 'professional',
    label: 'Professional',
    hint: 'Conventional layouts for corporate, finance and public-sector roles.',
  },
  { key: 'modern', label: 'Modern', hint: 'Colour and structure without being decorative.' },
  { key: 'creative', label: 'Creative', hint: 'Bolder headers for design, media and marketing.' },
  {
    key: 'simple',
    label: 'Simple',
    hint: 'Plain and spacious, or dense when there is a lot to fit.',
  },
  { key: 'ats', label: 'ATS-friendly', hint: 'Plain text that screening software reads reliably.' },
];

/**
 * The hand-written templates: the original eleven, each its own component.
 *
 * They are deliberately not rewritten onto the engine (PLAN.md §2). They
 * already export correctly, and redrawing them would change the PDF of
 * every CV that has been downloaded in one of them.
 *
 * @type {TemplateDefinition[]}
 */
const HAND_WRITTEN = [
  {
    key: 'classic',
    category: 'professional',
    isTwoColumn: false,
    name: 'Classic',
    description: 'Single column with a centred header and ruled headings. Traditional and safe.',
    usesPhoto: false,
    Component: ClassicTemplate,
  },
  {
    key: 'modern',
    category: 'modern',
    isTwoColumn: true,
    name: 'Modern',
    description: 'Two columns with a coloured sidebar for your photo, contact details and skills.',
    usesPhoto: true,
    Component: ModernTemplate,
  },
  {
    key: 'minimal',
    category: 'simple',
    isTwoColumn: false,
    name: 'Minimal',
    description: 'Lots of whitespace and light section labels. The photo is optional.',
    usesPhoto: true,
    Component: MinimalTemplate,
  },
  {
    key: 'creative',
    category: 'creative',
    isTwoColumn: false,
    name: 'Creative',
    description: 'A bold coloured header band with icons for your contact details.',
    usesPhoto: true,
    Component: CreativeTemplate,
  },
  {
    key: 'ats',
    category: 'ats',
    isTwoColumn: false,
    name: 'ATS-Friendly',
    description:
      'Plain single column, no graphics or colour. Built to be read correctly by screening software.',
    usesPhoto: false,
    Component: AtsTemplate,
  },
  {
    key: 'executive',
    category: 'professional',
    isTwoColumn: true,
    name: 'Executive',
    description:
      'Wide-tracked name over a rule, with contact details, education and skills in a rail beside your career history.',
    usesPhoto: false,
    Component: ExecutiveTemplate,
  },
  {
    key: 'banner',
    category: 'modern',
    isTwoColumn: false,
    name: 'Banner',
    description:
      'Centred two-tone name above a full-width contact band, then ruled sections and skills in two columns.',
    usesPhoto: false,
    Component: BannerTemplate,
  },
  {
    key: 'monogram',
    category: 'professional',
    isTwoColumn: false,
    name: 'Monogram',
    description:
      'An initials badge beside a widely spaced name, with contact details stacked in the top right.',
    usesPhoto: false,
    Component: MonogramTemplate,
  },
  {
    key: 'formal',
    category: 'professional',
    isTwoColumn: false,
    name: 'Formal',
    description:
      'Centred upper-case name and one contact line, with key skills running in three columns.',
    usesPhoto: false,
    Component: FormalTemplate,
  },
  {
    key: 'editorial',
    category: 'simple',
    isTwoColumn: false,
    name: 'Editorial',
    description:
      'A large left-aligned name, spaced capitals for your role, and generous space between sections.',
    usesPhoto: false,
    Component: EditorialTemplate,
  },
  {
    key: 'compact',
    category: 'simple',
    isTwoColumn: false,
    name: 'Compact',
    description: 'Tight spacing and small headings, for a long history that still has to fit.',
    usesPhoto: false,
    Component: CompactTemplate,
  },
].map((template) => ({ defaults: ORIGINAL_DEFAULTS, ...template }));

/**
 * The designed templates, turned from data into registry entries.
 *
 * The design object already says everything the gallery needs — its name,
 * category, whether it has a sidebar — so the entry is built from it
 * rather than written out a second time and left to drift.
 *
 * @type {TemplateDefinition[]}
 */
const DESIGNED = DESIGNS.map((design) => ({
  key: design.key,
  name: design.name,
  description: design.description,
  category: design.category,
  isTwoColumn: design.isTwoColumn,
  usesPhoto: design.usesPhoto,
  defaults: design.defaults,
  Component: makeDesignedTemplate(design),
}));

/** @type {TemplateDefinition[]} */
export const TEMPLATES = [...HAND_WRITTEN, ...DESIGNED];

/** Quick lookup by key. */
const BY_KEY = new Map(TEMPLATES.map((template) => [template.key, template]));

/**
 * Finds a template definition, falling back to Classic if the stored key is
 * one this build does not know about.
 * @param {string} key - The CV's `templateKey`.
 * @returns {TemplateDefinition}
 */
export function getTemplate(key) {
  return BY_KEY.get(key) ?? BY_KEY.get('classic');
}
