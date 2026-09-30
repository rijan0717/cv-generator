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
import './templates.css';

/**
 * @typedef {object} TemplateDefinition
 * @property {string} key - Matches `templateKey` on the CV document.
 * @property {string} name - Shown in the picker.
 * @property {string} description - One line explaining when to use it.
 * @property {boolean} usesPhoto - Whether this template renders the photo.
 * @property {React.ComponentType<{cv: object}>} Component - The renderer.
 */

/** @type {TemplateDefinition[]} */
export const TEMPLATES = [
  {
    key: 'classic',
    name: 'Classic',
    description: 'Single column with a centred header and ruled headings. Traditional and safe.',
    usesPhoto: false,
    Component: ClassicTemplate,
  },
  {
    key: 'modern',
    name: 'Modern',
    description: 'Two columns with a coloured sidebar for your photo, contact details and skills.',
    usesPhoto: true,
    Component: ModernTemplate,
  },
  {
    key: 'minimal',
    name: 'Minimal',
    description: 'Lots of whitespace and light section labels. The photo is optional.',
    usesPhoto: true,
    Component: MinimalTemplate,
  },
  {
    key: 'creative',
    name: 'Creative',
    description: 'A bold coloured header band with icons for your contact details.',
    usesPhoto: true,
    Component: CreativeTemplate,
  },
  {
    key: 'ats',
    name: 'ATS-Friendly',
    description:
      'Plain single column, no graphics or colour. Built to be read correctly by screening software.',
    usesPhoto: false,
    Component: AtsTemplate,
  },
  {
    key: 'executive',
    name: 'Executive',
    description:
      'Wide-tracked name over a rule, with contact details, education and skills in a rail beside your career history.',
    usesPhoto: false,
    Component: ExecutiveTemplate,
  },
  {
    key: 'banner',
    name: 'Banner',
    description:
      'Centred two-tone name above a full-width contact band, then ruled sections and skills in two columns.',
    usesPhoto: false,
    Component: BannerTemplate,
  },
  {
    key: 'monogram',
    name: 'Monogram',
    description:
      'An initials badge beside a widely spaced name, with contact details stacked in the top right.',
    usesPhoto: false,
    Component: MonogramTemplate,
  },
  {
    key: 'formal',
    name: 'Formal',
    description:
      'Centred upper-case name and one contact line, with key skills running in three columns.',
    usesPhoto: false,
    Component: FormalTemplate,
  },
  {
    key: 'editorial',
    name: 'Editorial',
    description:
      'A large left-aligned name, spaced capitals for your role, and generous space between sections.',
    usesPhoto: false,
    Component: EditorialTemplate,
  },
  {
    key: 'compact',
    name: 'Compact',
    description: 'Tight spacing and small headings, for a long history that still has to fit.',
    usesPhoto: false,
    Component: CompactTemplate,
  },
];

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
