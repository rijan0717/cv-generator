import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/**
 * Minimal template: one column, generous whitespace, light section labels and
 * no rules. The photo is optional and rendered small when present.
 *
 * @param {{cv: object}} props
 */
export default function MinimalTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);

  return (
    <div className="cv-page cv-minimal">
      <header className="cv-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10mm' }}>
          {cv.personal.photoUrl && <img src={cv.personal.photoUrl} alt="" className="cv-photo" />}

          <div>
            <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
            {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}
          </div>
        </div>

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
