import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/** Sections that belong in the narrow left rail rather than the main column. */
const RAIL_SECTIONS = new Set(['education', 'skills', 'languages', 'certifications']);

/**
 * Executive template: a wide-tracked name over a thick rule, then two
 * columns — a narrow rail for contact details and the list-like sections,
 * and a wide column for the narrative ones.
 *
 * The split is by section type rather than by position, so reordering
 * sections in the customisation panel still puts each one on the correct
 * side. That is the same rule the Modern template follows.
 *
 * Suits senior roles: it reads as a document rather than a form, and the
 * rail keeps qualifications visible beside the career history.
 *
 * @param {{cv: object}} props
 */
export default function ExecutiveTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);

  const rail = sections.filter((key) => RAIL_SECTIONS.has(key));
  const main = sections.filter((key) => !RAIL_SECTIONS.has(key));

  return (
    <div className="cv-page cv-executive">
      <header className="cv-exec-head">
        <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
        {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}
      </header>

      <div className="cv-exec-cols">
        <aside className="cv-exec-rail">
          {contacts.length > 0 && (
            <section className="cv-section">
              <h2 className="cv-section-title">Contact</h2>
              <div className="cv-contact">
                {contacts.map((contact) => (
                  <span key={contact.key}>
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
            </section>
          )}

          {rail.map((key) => (
            <section key={key} className="cv-section">
              <h2 className="cv-section-title">{SECTION_LABELS[key]}</h2>
              <SectionBody cv={cv} sectionKey={key} skillVariant="plain" />
            </section>
          ))}
        </aside>

        <div className="cv-exec-main">
          {main.map((key) => (
            <section key={key} className="cv-section">
              <h2 className="cv-section-title">
                {key === 'summary' ? 'Career Summary' : SECTION_LABELS[key]}
              </h2>
              <SectionBody cv={cv} sectionKey={key} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
