import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/** Sections that belong in the narrow coloured sidebar. */
const SIDEBAR_SECTIONS = new Set(['skills', 'languages', 'certifications']);

/**
 * Modern template: two columns, with a coloured sidebar carrying the photo,
 * contact details and the short list-like sections, and the main column
 * carrying the narrative ones.
 *
 * The split is by section type rather than by a fixed list position, so
 * reordering sections in the customisation panel still puts each one on the
 * correct side.
 *
 * @param {{cv: object}} props
 */
export default function ModernTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);

  const sidebar = sections.filter((key) => SIDEBAR_SECTIONS.has(key));
  const main = sections.filter((key) => !SIDEBAR_SECTIONS.has(key));

  return (
    <div className="cv-page cv-modern">
      <aside className="cv-sidebar">
        {cv.personal.photoUrl && <img src={cv.personal.photoUrl} alt="" className="cv-photo" />}

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

        {sidebar.map((key) => (
          <section key={key} className="cv-section">
            <h2 className="cv-section-title">{SECTION_LABELS[key]}</h2>
            <SectionBody cv={cv} sectionKey={key} skillVariant="pills" />
          </section>
        ))}
      </aside>

      <div className="cv-main">
        <header style={{ marginBottom: 'var(--cv-section-gap)' }}>
          <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
          {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}
        </header>

        {main.map((key) => (
          <section key={key} className="cv-section">
            <h2 className="cv-section-title">{SECTION_LABELS[key]}</h2>
            <SectionBody cv={cv} sectionKey={key} />
          </section>
        ))}
      </div>
    </div>
  );
}
