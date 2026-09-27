import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/**
 * Classic template: a single column with a centred header and ruled section
 * headings. The most conventional of the five, and the safest choice for a
 * traditional employer.
 *
 * Every template takes the same two props, `cv` and `settings`, so they are
 * interchangeable and the customisation panel works identically for all.
 *
 * @param {{cv: object}} props
 */
export default function ClassicTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);

  return (
    <div className="cv-page cv-classic">
      <header className="cv-header">
        <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
        {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}

        {contacts.length > 0 && (
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
        )}
      </header>

      {sections.map((key) => (
        <section key={key} className="cv-section">
          <h2 className="cv-section-title">{SECTION_LABELS[key]}</h2>
          <SectionBody cv={cv} sectionKey={key} skillVariant="plain" />
        </section>
      ))}
    </div>
  );
}
