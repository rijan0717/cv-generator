import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/**
 * Editorial template: a large left-aligned name with the role beneath it in
 * spaced capitals, a single contact line, then generously spaced sections
 * under quiet ruled headings.
 *
 * Aimed at marketing and communications roles, where the page is expected to
 * look composed but must still be one plain column a screening system can
 * read straight through.
 *
 * @param {{cv: object}} props
 */
export default function EditorialTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);

  return (
    <div className="cv-page cv-editorial">
      <header className="cv-editorial-head">
        <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
        {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}

        {contacts.length > 0 && (
          <div className="cv-contact">
            {contacts.map((contact, index) => (
              <span key={contact.key}>
                {index > 0 && <span className="cv-editorial-sep">&middot;</span>}
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
          <h2 className="cv-section-title">
            {key === 'summary' ? 'Profile' : SECTION_LABELS[key]}
          </h2>
          <SectionBody cv={cv} sectionKey={key} skillVariant="plain" />
        </section>
      ))}
    </div>
  );
}
