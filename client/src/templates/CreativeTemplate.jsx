import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/**
 * Inline SVG icons for the contact row.
 *
 * They are drawn inline rather than loaded from an icon library, both because
 * the project rules keep dependencies to a minimum and because Puppeteer must
 * be able to render them without waiting for an external font or sprite to
 * load.
 */
const ICONS = {
  email: 'M2 4h12v8H2z M2 4l6 5 6-5',
  phone:
    'M3 3h3l1.5 4-2 1a9 9 0 0 0 4.5 4.5l1-2 4 1.5v3a1 1 0 0 1-1 1A13 13 0 0 1 2 4a1 1 0 0 1 1-1z',
  address:
    'M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z M8 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  website: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1z M1 8h14 M8 1a11 11 0 0 1 0 14 M8 1a11 11 0 0 0 0 14',
  linkedin: 'M3 6h2v7H3z M3 3h2v2H3z M7 6h2v1a2 2 0 0 1 4 1.5V13h-2V9a1 1 0 0 0-2 0v4H7z',
  github:
    'M8 1a7 7 0 0 0-2.2 13.6c.35.06.48-.15.48-.34v-1.2c-1.95.42-2.36-.94-2.36-.94-.32-.8-.78-1.02-.78-1.02-.64-.44.05-.43.05-.43.7.05 1.07.72 1.07.72.63 1.07 1.65.76 2.05.58.06-.45.25-.76.45-.94-1.56-.18-3.2-.78-3.2-3.47 0-.77.28-1.4.73-1.89-.07-.18-.32-.9.07-1.87 0 0 .6-.19 1.95.72a6.8 6.8 0 0 1 3.55 0c1.35-.91 1.94-.72 1.94-.72.4.97.15 1.69.08 1.87.46.49.73 1.12.73 1.89 0 2.7-1.65 3.29-3.22 3.46.26.22.48.65.48 1.3v1.93c0 .19.13.41.49.34A7 7 0 0 0 8 1z',
};

/**
 * One contact item with its icon.
 * @param {{item: {key: string, label: string, href: string|null}}} props
 */
function ContactItem({ item }) {
  const content = (
    <>
      <svg
        className="cv-icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={ICONS[item.key]} />
      </svg>
      {item.label}
    </>
  );

  return item.href ? (
    <a href={item.href} className="cv-link">
      {content}
    </a>
  ) : (
    <span>{content}</span>
  );
}

/**
 * Creative template: a full-width coloured header band carrying the photo,
 * name and an icon contact row, with the rest of the CV in a single column
 * below.
 *
 * @param {{cv: object}} props
 */
export default function CreativeTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);

  return (
    <div className="cv-page cv-creative">
      <header className="cv-band">
        {cv.personal.photoUrl && <img src={cv.personal.photoUrl} alt="" className="cv-photo" />}

        <div>
          <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
          {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}

          {contacts.length > 0 && (
            <div className="cv-contact">
              {contacts.map((contact) => (
                <ContactItem key={contact.key} item={contact} />
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="cv-body">
        {sections.map((key) => (
          <section key={key} className="cv-section">
            <h2 className="cv-section-title">{SECTION_LABELS[key]}</h2>
            <SectionBody cv={cv} sectionKey={key} skillVariant="pills" />
          </section>
        ))}
      </div>
    </div>
  );
}
