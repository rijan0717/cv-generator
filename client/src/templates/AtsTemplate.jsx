import { SECTION_LABELS, visibleSections, contactItems } from './templateUtils.js';
import { SectionBody } from './TemplateParts.jsx';

/**
 * ATS-friendly template.
 *
 * An applicant tracking system reads the text layer of a PDF, so anything
 * that helps a human eye can hurt a machine. This template therefore breaks
 * the pattern of the other four on purpose:
 *
 * - **One column, no sidebar.** Multi-column layouts are read in the wrong
 *   order when the text is extracted linearly.
 * - **No photo and no icons.** They carry no text and can confuse parsing.
 * - **No skill pills.** Skills are a plain comma-separated line, which is
 *   what keyword matching expects to find.
 * - **Fixed Arial and plain black on white**, set in `templates.css`, so the
 *   custom colours and fonts are deliberately ignored here. Losing the
 *   styling is the point: the whole purpose of this template is to maximise
 *   the chance of being parsed correctly.
 * - **Plain, conventional headings** ("Experience", "Education") that a
 *   parser is likely to recognise.
 *
 * @param {{cv: object}} props
 */
export default function AtsTemplate({ cv }) {
  const sections = visibleSections(cv);
  const contacts = contactItems(cv.personal);

  return (
    <div className="cv-page cv-ats">
      <header style={{ marginBottom: 'var(--cv-section-gap)' }}>
        <h1 className="cv-name">{cv.personal.fullName || 'Your Name'}</h1>
        {cv.personal.headline && <p className="cv-headline">{cv.personal.headline}</p>}

        {contacts.length > 0 && (
          <div className="cv-contact">
            {/* Plain text, not links: the extracted text is what matters. */}
            {contacts.map((contact) => (
              <span key={contact.key}>{contact.label}</span>
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
