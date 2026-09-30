import { SECTION_LABELS, visibleSections, contactItems, initials } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/**
 * Monogram template: a small initials badge beside a wide-tracked name, with
 * the contact details stacked in the top right, then dense ruled sections.
 *
 * The badge is drawn from the name itself rather than uploaded, so the
 * layout has a mark at the top without needing a photo — useful where a
 * photo is not customary, which is most of the UK market.
 *
 * @param {{cv: object}} props
 */
export default function MonogramTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);
  const badge = initials(cv.personal.fullName);

  return (
    <div className="cv-page cv-monogram">
      <header className="cv-mono-head">
        <div className="cv-mono-identity">
          {badge && (
            <span className="cv-mono-badge" aria-hidden="true">
              {badge}
            </span>
          )}
          <div>
            <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
            {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="cv-contact cv-mono-contact">
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
          <SectionBody cv={cv} sectionKey={key} skillVariant="columns" />
        </section>
      ))}
    </div>
  );
}
