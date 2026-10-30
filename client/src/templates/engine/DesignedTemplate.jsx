import { SECTION_LABELS, visibleSections, contactItems } from '../templateUtils.js';
import { SectionBody, ContactItem } from '../TemplateParts.jsx';
import './engine.css';

/**
 * The template engine.
 *
 * The first eleven templates are each a hand-written component. That does
 * not scale to fifty: most of what makes two CVs look different is not the
 * markup but a handful of choices — where the sidebar sits, how a heading
 * is drawn, the shape of the photo — and writing those out fifty times
 * would be fifty near-copies of the same file.
 *
 * So a designed template is **data plus one renderer**. A design is a
 * small object of choices (see `DESIGN_OPTIONS` below and `designs.js`),
 * and this component turns any design into a CV. Each choice is written to
 * the page as a `data-` attribute, and `engine.css` has one block of rules
 * per choice — so "what does `heading: 'chip'` do?" is answered by one
 * rule in one file.
 *
 * Every designed template still takes the same `cv` prop as the
 * hand-written ones and reads the same CSS variables, so the customisation
 * panel, the preview and the PDF export work identically for all of them.
 */

/**
 * Every choice a design can make, and what each value means. Kept beside
 * the renderer as the reference for anyone writing a new design, and used
 * by the tests to reject a design with a misspelt value.
 */
export const DESIGN_OPTIONS = {
  /** How the page is divided. */
  layout: {
    single: 'One column, top to bottom.',
    'sidebar-left': 'A side column on the left for the short, list-like sections.',
    'sidebar-right': 'The same side column on the right.',
    timeline: 'One column, with dates in a gutter and a line joining the entries.',
  },
  /** Where and how the name is drawn. */
  header: {
    left: 'Name and headline aligned left.',
    centered: 'Name, headline and contact details centred.',
    split: 'Name on the left, contact details stacked on the right.',
    band: 'A full-width coloured band across the top of the page.',
    tinted: 'A full-width band in a light wash of the primary colour, with dark text.',
    panel: 'Name and photo at the top of the side column (sidebar layouts only).',
  },
  /** How section headings are drawn. */
  heading: {
    rule: 'Capitals over a thin full-width rule.',
    underline: 'A short, thick stroke under the heading.',
    bar: 'A coloured bar to the left of the heading.',
    chip: 'White text on a filled, rounded block.',
    spaced: 'Small, widely spaced capitals with no rule.',
    ornament: 'Centred, with a rule running out to either side.',
    band: 'A tinted strip the full width of the column.',
    dot: 'A filled circle before the heading.',
    pill: 'A light, fully rounded strip behind the heading.',
    boxed: 'Capitals inside a thin outlined box.',
    double: 'Capitals over a thick rule with a thin one beneath it.',
  },
  /** The photo's shape. `none` means the design never draws one. */
  photo: {
    circle: 'Round.',
    rounded: 'Square with soft corners.',
    square: 'Square with hard corners.',
    none: 'No photo.',
  },
  /** The side column's colour (sidebar layouts only). */
  sidebarTone: {
    solid: 'Filled with the primary colour, white text.',
    tint: 'A light wash of the primary colour.',
    plain: 'No fill; a rule divides it from the main column.',
  },
  /** The side column's width (sidebar layouts only). */
  sidebarWidth: {
    narrow: 'About a third of the page.',
    wide: 'About two fifths of the page.',
  },
  /** How the contact details are laid out. */
  contact: {
    inline: 'One line, separated by dots.',
    icons: 'One wrapping row, each with an icon.',
    stacked: 'One per line.',
    'stacked-icons': 'One per line, each with an icon.',
  },
  /** A decoration that is not part of the content. */
  accent: {
    none: 'Nothing.',
    'top-stripe': 'A thin coloured stripe along the top edge.',
    'side-stripe': 'A coloured stripe down the left edge of every sheet.',
    corner: 'A coloured triangle in the top right corner.',
    diagonal: 'Two slanted coloured shapes across the top right corner.',
  },
  /** The name's size. */
  nameSize: { md: 'Standard.', lg: 'Large.', xl: 'Very large.' },
  /** The name's letter case. */
  nameCase: { normal: 'As typed.', upper: 'Capitals, widely spaced.' },
  /** The skill list's style; see `SkillList` in TemplateParts.jsx. */
  skills: {
    pills: 'Tags.',
    plain: 'A comma-separated line.',
    levelled: 'Name and level as words.',
    columns: 'A bulleted list in two columns.',
    bars: 'A bar showing the level.',
    dots: 'Four dots showing the level.',
  },
};

/** What a design gets for any choice it leaves out. */
const DEFAULT_DESIGN = {
  layout: 'single',
  header: 'left',
  heading: 'rule',
  photo: 'none',
  sidebarTone: 'tint',
  sidebarWidth: 'narrow',
  sidebarSections: ['skills', 'languages', 'certifications'],
  contact: 'inline',
  accent: 'none',
  nameSize: 'lg',
  nameCase: 'normal',
  skills: 'pills',
  labels: {},
};

/**
 * The contact details, in the style the design asks for.
 * @param {{contacts: Array<object>, style: string}} props
 */
function ContactBlock({ contacts, style }) {
  if (contacts.length === 0) return null;

  const withIcons = style === 'icons' || style === 'stacked-icons';

  return (
    <div className="cv-contact cvd-contact">
      {contacts.map((contact, index) =>
        withIcons ? (
          <ContactItem key={contact.key} item={contact} />
        ) : (
          <span key={contact.key}>
            {/* The dot separator belongs to the inline style only; the
                stacked style puts each item on its own line instead. */}
            {style === 'inline' && index > 0 && (
              <span className="cvd-sep" aria-hidden="true">
                &middot;
              </span>
            )}
            {contact.href ? (
              <a href={contact.href} className="cv-link">
                {contact.label}
              </a>
            ) : (
              contact.label
            )}
          </span>
        ),
      )}
    </div>
  );
}

/**
 * The name, headline and (optionally) photo and contact details.
 * @param {{cv: object, design: object, contacts: Array<object>,
 *          showPhoto: boolean, showContact: boolean}} props
 */
function Identity({ cv, design, contacts, showPhoto, showContact }) {
  const photo = showPhoto && cv.personal.photoUrl;

  return (
    <header className="cvd-header">
      {photo && <img src={cv.personal.photoUrl} alt="" className="cv-photo cvd-photo" />}

      <div className="cvd-identity">
        <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
        {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}
      </div>

      {showContact && <ContactBlock contacts={contacts} style={design.contact} />}
    </header>
  );
}

/**
 * A run of sections with the design's heading labels.
 * @param {{cv: object, design: object, keys: string[]}} props
 */
function Sections({ cv, design, keys }) {
  return keys.map((key) => (
    <section key={key} className="cv-section">
      <h2 className="cv-section-title">{design.labels[key] ?? SECTION_LABELS[key]}</h2>
      <SectionBody cv={cv} sectionKey={key} skillVariant={design.skills} />
    </section>
  ));
}

/**
 * Renders a CV in the given design.
 *
 * Step by step:
 *   1. Fill in any choice the design left out from DEFAULT_DESIGN.
 *   2. Work out the visible sections in the user's order, and split them
 *      between the main column and the side column (by section type, so
 *      reordering in the panel still puts each one on the correct side).
 *   3. Decide where the identity block goes: across the top for a band,
 *      in the side column for a panel, otherwise at the top of the main
 *      column — never across the top of a sidebar layout, where the side
 *      column's colour would show behind it.
 *   4. Write every choice onto the page as a data attribute, which is all
 *      engine.css needs to style it.
 *
 * @param {{cv: object, design: object}} props
 */
export default function DesignedTemplate({ cv, design: partial }) {
  // 1. Complete the design.
  const design = { ...DEFAULT_DESIGN, ...partial, labels: partial.labels ?? {} };

  const hasSidebar = design.layout === 'sidebar-left' || design.layout === 'sidebar-right';

  // 2. Split the sections.
  const sections = visibleSections(cv);
  const sideKeys = new Set(hasSidebar ? design.sidebarSections : []);
  const side = sections.filter((key) => sideKeys.has(key));
  const main = sections.filter((key) => !sideKeys.has(key));

  const contacts = contactItems(cv.personal);
  const showPhoto = design.photo !== 'none';

  // 3. Place the identity block. A panel header only makes sense with a
  //    side column, so without one it falls back to a plain left header.
  const header = design.header === 'panel' && !hasSidebar ? 'left' : design.header;
  const identityInSide = hasSidebar && header === 'panel';
  // A band and a tinted band both run the full width of the sheet, above
  // the columns, because each paints its own opaque background.
  const fullWidth = header === 'band' || header === 'tinted';
  // Stacked contact details sit in the side column when there is one,
  // which is what the side column is for; otherwise in the header.
  const contactInSide = hasSidebar && design.contact.startsWith('stacked');

  const identity = (
    <Identity
      cv={cv}
      design={design}
      contacts={contacts}
      showPhoto={showPhoto}
      showContact={!contactInSide}
    />
  );

  const sideColumn = hasSidebar && (
    <aside className="cvd-side">
      {identityInSide && identity}
      {contactInSide && contacts.length > 0 && (
        <section className="cv-section">
          <h2 className="cv-section-title">{design.labels.contact ?? 'Contact'}</h2>
          <ContactBlock contacts={contacts} style={design.contact} />
        </section>
      )}
      <Sections cv={cv} design={design} keys={side} />
    </aside>
  );

  // 4. Hand every choice to the stylesheet.
  return (
    <div
      className="cv-page cv-designed"
      data-layout={design.layout}
      data-header={header}
      data-heading={design.heading}
      data-photo={design.photo}
      data-tone={design.sidebarTone}
      data-width={design.sidebarWidth}
      data-contact={design.contact}
      data-accent={design.accent}
      data-name-size={design.nameSize}
      data-name-case={design.nameCase}
    >
      {/* Decoration only: no text, and never read aloud. */}
      {design.accent !== 'none' && <span className="cvd-accent" aria-hidden="true" />}

      {fullWidth && identity}

      <div className="cvd-body">
        {design.layout === 'sidebar-left' && sideColumn}

        <div className="cvd-main">
          {!fullWidth && !identityInSide && identity}
          <Sections cv={cv} design={design} keys={main} />
        </div>

        {design.layout === 'sidebar-right' && sideColumn}
      </div>
    </div>
  );
}

/**
 * Wraps a design as an ordinary template component, so the registry, the
 * preview and the print page can treat it exactly like a hand-written one.
 *
 * @param {object} design - One entry from designs.js.
 * @returns {React.ComponentType<{cv: object}>}
 */
export function makeDesignedTemplate(design) {
  function Designed({ cv }) {
    return <DesignedTemplate cv={cv} design={design} />;
  }
  // A readable name in React's developer tools and in test failures.
  Designed.displayName = `Designed(${design.key})`;
  return Designed;
}
