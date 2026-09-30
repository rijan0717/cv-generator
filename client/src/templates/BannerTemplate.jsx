import { SECTION_LABELS, visibleSections, contactItems, splitName } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/**
 * Banner template: a centred two-tone name above a full-width contact band,
 * then a conventional single column of ruled sections.
 *
 * The band is the only block of colour on the page, which is what makes the
 * layout feel designed without costing a screening system anything — the
 * contact details are still ordinary text inside it, not an image.
 *
 * Skills flow into two columns, because a manager's skill list is usually a
 * dozen short phrases and one long column of them wastes half the page.
 *
 * @param {{cv: object}} props
 */
export default function BannerTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);
  const { first, rest } = splitName(cv.personal.fullName || 'Your Name');

  return (
    <div className="cv-page cv-banner">
      <header className="cv-banner-head">
        {/* The surname carries the accent colour, the forename the text
            colour, so the name reads as one line with a deliberate emphasis
            rather than two differently coloured words. */}
        <h1 className="cv-name">
          <span className="cv-banner-first">{first}</span>
          {rest && <span className="cv-banner-rest"> {rest}</span>}
        </h1>
        {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}
      </header>

      {contacts.length > 0 && (
        <div className="cv-banner-strip">
          {contacts.map((contact, index) => (
            <span key={contact.key}>
              {index > 0 && <span className="cv-banner-sep">|</span>}
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

      <div className="cv-banner-body">
        {sections.map((key) => (
          <section key={key} className="cv-section">
            <h2 className="cv-section-title">{SECTION_LABELS[key]}</h2>
            <SectionBody cv={cv} sectionKey={key} skillVariant="columns" />
          </section>
        ))}
      </div>
    </div>
  );
}
