import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/**
 * Formal template: everything in the header centred — an upper-case name, a
 * small role line, and one line of contact details — then left-aligned
 * sections under full-width ruled headings.
 *
 * Skills run in three columns, which is how the reference handles a long
 * "key skills" list at the foot of the page without it becoming a column of
 * single words.
 *
 * The most conservative layout in the set. Where Classic is simply plain,
 * this is deliberately formal: wide letter spacing and symmetry.
 *
 * @param {{cv: object}} props
 */
export default function FormalTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);

  return (
    <div className="cv-page cv-formal">
      <header className="cv-formal-head">
        <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
        {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}

        {contacts.length > 0 && (
          <div className="cv-contact">
            {contacts.map((contact, index) => (
              <span key={contact.key}>
                {index > 0 && <span className="cv-formal-sep">|</span>}
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
      </header>

      {sections.map((key) => (
        <section key={key} className="cv-section">
          <h2 className="cv-section-title">{SECTION_LABELS[key]}</h2>
          <SectionBody cv={cv} sectionKey={key} skillVariant="columns" />
        </section>
      ))}
    </div>
  );
}
