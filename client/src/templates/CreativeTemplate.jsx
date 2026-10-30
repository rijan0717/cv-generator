import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody, ContactItem } from './TemplateParts.jsx';

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
