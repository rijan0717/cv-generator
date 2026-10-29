/**
 * Helpers shared by every CV template.
 *
 * The templates themselves only lay content out. Everything about *how* a CV
 * is styled — colour, font, size, spacing — is expressed here as CSS custom
 * properties, which is what lets one customisation panel drive all of them
 * templates identically.
 */

/**
 * The printed page, in millimetres.
 *
 * These must stay in step with the `@page` rules at the end of
 * templates.css: the browser uses those when it splits the CV into sheets,
 * and the preview uses these to draw the guides showing where it will split.
 * If the two disagree the guides lie, so they are written down once here and
 * cross-referenced from the stylesheet.
 */
export const PAGE_GEOMETRY_MM = {
  width: 210,
  height: 297,
  /** The first sheet runs to the top edge, so full-bleed headers can. */
  firstPageTopMargin: 0,
  /** Every later sheet starts below this gap. */
  topMargin: 14,
  /** Every sheet, including the first, ends above this gap. */
  bottomMargin: 14,
};

/** Millimetres to CSS pixels, at the 96dpi reference the templates assume. */
export const MM_TO_PX = 96 / 25.4;

/**
 * Works out where the printed page breaks fall within the continuous
 * preview column, so the preview can draw a guide at each one.
 *
 * The first sheet holds more than the others because it has no top margin,
 * which is why this cannot simply be "every 297mm".
 *
 * @param {number} contentHeightPx - Rendered height of the whole CV.
 * @returns {number[]} Offsets, in pixels from the top, of each page break.
 */
export function pageBreakOffsets(contentHeightPx) {
  const { height, topMargin, bottomMargin, firstPageTopMargin } = PAGE_GEOMETRY_MM;

  const firstPage = (height - firstPageTopMargin - bottomMargin) * MM_TO_PX;
  const laterPage = (height - topMargin - bottomMargin) * MM_TO_PX;

  const offsets = [];
  for (let offset = firstPage; offset < contentHeightPx; offset += laterPage) {
    offsets.push(offset);
  }

  return offsets;
}

/**
 * Font stacks offered in the customisation panel.
 *
 * A curated list rather than an open one: every family here is loaded by
 * the Google Fonts link in `index.html`, which the print page shares, so
 * whatever the preview shows the PDF can render. A name typed in from
 * outside the list would fall back to a system font in one place and not
 * the other. The second six were added with the heading font, so there
 * are enough serif, sans and display faces to pair a heading with a body.
 */
export const FONT_STACKS = {
  Inter: "'Inter', system-ui, sans-serif",
  Lato: "'Lato', system-ui, sans-serif",
  Merriweather: "'Merriweather', Georgia, serif",
  'Playfair Display': "'Playfair Display', Georgia, serif",
  'Roboto Slab': "'Roboto Slab', Georgia, serif",
  'Source Sans 3': "'Source Sans 3', system-ui, sans-serif",
  Poppins: "'Poppins', system-ui, sans-serif",
  Montserrat: "'Montserrat', system-ui, sans-serif",
  Raleway: "'Raleway', system-ui, sans-serif",
  Lora: "'Lora', Georgia, serif",
  'EB Garamond': "'EB Garamond', Georgia, serif",
  Oswald: "'Oswald', 'Arial Narrow', sans-serif",
};

/** Base body size in millimetres of the rendered page, per size setting. */
const FONT_SIZES = {
  small: '9.5pt',
  medium: '10.5pt',
  large: '11.5pt',
};

/** Vertical rhythm between sections, per spacing setting. */
const SPACING = {
  compact: { section: '10px', item: '7px' },
  normal: { section: '16px', item: '11px' },
};

/**
 * Turns the stored settings object into the CSS custom properties every
 * template reads. Returning a style object rather than injecting a stylesheet
 * keeps the preview and the print page identical.
 *
 * @param {object} settings - The CV's `settings` sub-document.
 * @returns {React.CSSProperties} Style object of CSS variables.
 */
export function buildTemplateVariables(settings = {}) {
  const spacing = SPACING[settings.spacing] ?? SPACING.normal;

  return {
    '--cv-primary': settings.primaryColor || '#0f172a',
    '--cv-background': settings.backgroundColor || '#ffffff',
    '--cv-text': settings.textColor || '#1e293b',
    // A muted tone derived from the text colour, used for dates and captions.
    '--cv-muted': 'color-mix(in srgb, var(--cv-text) 62%, transparent)',
    '--cv-rule': 'color-mix(in srgb, var(--cv-text) 18%, transparent)',
    '--cv-tint': 'color-mix(in srgb, var(--cv-primary) 8%, transparent)',
    '--cv-font': FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.Inter,
    // The name and section headings. Empty means "the same as the body",
    // which is how every CV made before this setting existed still looks.
    '--cv-heading-font':
      FONT_STACKS[settings.headingFont] ?? FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.Inter,
    '--cv-font-size': FONT_SIZES[settings.fontSize] ?? FONT_SIZES.medium,
    '--cv-section-gap': spacing.section,
    '--cv-item-gap': spacing.item,
  };
}

/**
 * Formats a stored `YYYY-MM` value for display.
 * @param {string} value - The stored date, or an empty string.
 * @returns {string} e.g. "Mar 2024", or '' when there is nothing to show.
 */
export function formatMonth(value) {
  if (!value) return '';

  const [year, month] = value.split('-');
  if (!year) return '';
  if (!month) return year;

  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/**
 * Builds the "Mar 2024 – Present" style range shown against each entry.
 * @param {string} startDate - Stored start date.
 * @param {string} endDate - Stored end date.
 * @param {boolean} [isCurrent] - True when the role is ongoing.
 * @returns {string} The formatted range, or '' when no dates are set.
 */
export function formatDateRange(startDate, endDate, isCurrent = false) {
  const start = formatMonth(startDate);
  const end = isCurrent ? 'Present' : formatMonth(endDate);

  if (!start && !end) return '';
  if (!start) return end;
  if (!end) return start;

  return `${start} – ${end}`;
}

/**
 * Decides which sections to render and in what order, from the user's
 * settings. Any section the user has hidden, or that has no content, is left
 * out so the CV never shows an empty heading.
 *
 * @param {object} cv - The CV document.
 * @returns {string[]} Ordered list of section keys to render.
 */
export function visibleSections(cv) {
  const order = cv.settings?.sectionOrder?.length
    ? cv.settings.sectionOrder
    : [
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
        'languages',
        'references',
      ];

  const hidden = new Set(cv.settings?.hiddenSections ?? []);

  return order.filter((key) => !hidden.has(key) && sectionHasContent(cv, key));
}

/**
 * Reports whether a section has anything worth printing.
 * @param {object} cv - The CV document.
 * @param {string} key - The section key.
 * @returns {boolean}
 */
export function sectionHasContent(cv, key) {
  switch (key) {
    case 'summary':
      return Boolean(cv.summary?.trim());
    case 'references':
      return cv.referencesOnRequest || (cv.references?.length ?? 0) > 0;
    default:
      return (cv[key]?.length ?? 0) > 0;
  }
}

/** Human-readable heading for each section key. */
export const SECTION_LABELS = {
  summary: 'Professional Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  references: 'References',
};

/**
 * Collects the contact details that are actually filled in, so a template can
 * render them without checking each one.
 * @param {object} personal - The CV's `personal` sub-document.
 * @returns {Array<{key: string, label: string, value: string, href: string|null}>}
 */
export function contactItems(personal = {}) {
  const items = [
    {
      key: 'email',
      value: personal.email,
      href: personal.email ? `mailto:${personal.email}` : null,
    },
    { key: 'phone', value: personal.phone, href: personal.phone ? `tel:${personal.phone}` : null },
    { key: 'address', value: personal.address, href: null },
    { key: 'website', value: personal.website, href: toHref(personal.website) },
    { key: 'linkedin', value: personal.linkedin, href: toHref(personal.linkedin) },
    { key: 'github', value: personal.github, href: toHref(personal.github) },
  ];

  return items
    .filter((item) => Boolean(item.value?.trim()))
    .map((item) => ({ ...item, label: item.value.replace(/^https?:\/\//, '') }));
}

/**
 * Makes a user-typed URL safe to put in an href.
 * Only http and https are allowed, so a pasted `javascript:` string can never
 * become a clickable link.
 * @param {string} value - The raw value from the form.
 * @returns {string|null} A safe absolute URL, or null.
 */
export function toHref(value) {
  if (!value?.trim()) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Builds the initials shown in the Monogram template's badge.
 *
 * Takes the first letter of the first and last words, so "Patricia Roberts"
 * gives "PR" and a single name gives one letter. Anything unusable falls
 * back to an empty string, which the template treats as "draw no badge".
 *
 * @param {string} fullName - The name as the user typed it.
 * @returns {string} One or two upper-case letters.
 */
export function initials(fullName = '') {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0][0].toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Splits a name so a template can colour the surname differently from the
 * forename, as the Banner layout does.
 *
 * @param {string} fullName - The name as the user typed it.
 * @returns {{first: string, rest: string}} The first word and everything else.
 */
export function splitName(fullName = '') {
  const trimmed = fullName.trim();
  const gap = trimmed.indexOf(' ');

  if (gap === -1) return { first: trimmed, rest: '' };

  return { first: trimmed.slice(0, gap), rest: trimmed.slice(gap + 1) };
}
