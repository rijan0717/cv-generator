import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/**
 * Compact template: the densest of the set. A tight header, a ruled contact
 * strip, small headings and close leading, so a long history still fits on
 * one or two pages.
 *
 * Skills run in three columns as a plain bulleted grid rather than pills,
 * which keeps the page quiet and the text layer clean.
 *
 * @param {{cv: object}} props
 */
export default function CompactTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);

  return (
    <div className="cv-page cv-compact">
      <header className="cv-compact-head">
        <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
        {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}
      </header>

      {contacts.length > 0 && (
        <div className="cv-contact cv-compact-strip">
          {contacts.map((contact, index) => (
            <span key={contact.key}>
              {index > 0 && <span className="cv-compact-sep">|</span>}
              {contact.href ? (
                <a href={contact.href} className="cv-link">
                  {contact.label}
                </a>
              ) : (
                contact.label
              )}
            </span>
          ))}
        </div>
      )}

      {sections.map((key) => (
        <section key={key} className="cv-section">
          <h2 className="cv-section-title">{SECTION_LABELS[key]}</h2>
          <SectionBody cv={cv} sectionKey={key} skillVariant="columns" />
        </section>
      ))}
    </div>
  );
}
