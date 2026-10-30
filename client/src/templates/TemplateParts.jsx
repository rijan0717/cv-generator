/**
 * Small building blocks the templates share.
 *
 * Each template decides its own layout and heading style, but the content of
 * an experience entry or a skill list is the same everywhere, so it is
 * written once here. Anything visual is driven by the CSS variables set in
 * `buildTemplateVariables`, never hard-coded.
 */
import { formatDateRange, toHref, skillLevelStep } from './templateUtils.js';

/**
 * Inline SVG icons for the contact details.
 *
 * They are drawn inline rather than loaded from an icon library, both because
 * the project rules keep dependencies to a minimum and because Puppeteer must
 * be able to render them without waiting for an external font or sprite to
 * load.
 */
export const CONTACT_ICONS = {
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
 * One contact detail with its icon.
 *
 * The wrapper is `inline-flex`, set here rather than in a stylesheet, so the
 * icon stays on the same line as its text wherever the item is used. A
 * sidebar stacks its contact details by making the list a column, and a
 * plain `display: block` wrapper inside that column would drop the label
 * below the icon instead of beside it.
 *
 * @param {{item: {key: string, label: string, href: string|null}}} props
 */
export function ContactItem({ item }) {
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
        <path d={CONTACT_ICONS[item.key]} />
      </svg>
      <span>{item.label}</span>
    </>
  );

  const style = { display: 'inline-flex', alignItems: 'center', gap: '5px' };

  return item.href ? (
    <a href={item.href} className="cv-link" style={style}>
      {content}
    </a>
  ) : (
    <span style={style}>{content}</span>
  );
}

/**
 * One entry in the Experience section.
 * @param {{entry: object, showAchievements?: boolean}} props
 */
export function ExperienceEntry({ entry, showAchievements = true }) {
  const range = formatDateRange(entry.startDate, entry.endDate, entry.isCurrent);

  return (
    <div className="cv-entry" style={{ marginBottom: 'var(--cv-item-gap)' }}>
      <div className="cv-entry-head">
        <span className="cv-entry-title">{entry.position}</span>
        {range && <span className="cv-entry-date">{range}</span>}
      </div>

      {(entry.company || entry.location) && (
        <div className="cv-entry-sub">
          {[entry.company, entry.location].filter(Boolean).join(' · ')}
        </div>
      )}

      {entry.description && <p className="cv-text">{entry.description}</p>}

      {showAchievements && entry.achievements?.length > 0 && (
        <ul className="cv-list">
          {entry.achievements
            .filter((achievement) => achievement?.trim())
            .map((achievement, index) => (
              <li key={index}>{achievement}</li>
            ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One entry in the Education section.
 * @param {{entry: object}} props
 */
export function EducationEntry({ entry }) {
  const range = formatDateRange(entry.startDate, entry.endDate);
  const qualification = [entry.degree, entry.fieldOfStudy].filter(Boolean).join(', ');

  return (
    <div className="cv-entry" style={{ marginBottom: 'var(--cv-item-gap)' }}>
      <div className="cv-entry-head">
        <span className="cv-entry-title">{qualification || entry.institution}</span>
        {range && <span className="cv-entry-date">{range}</span>}
      </div>

      {qualification && entry.institution && (
        <div className="cv-entry-sub">{entry.institution}</div>
      )}
      {entry.grade && <div className="cv-entry-sub">Grade: {entry.grade}</div>}
      {entry.description && <p className="cv-text">{entry.description}</p>}
    </div>
  );
}

/**
 * One entry in the Projects section.
 * @param {{entry: object}} props
 */
export function ProjectEntry({ entry }) {
  const href = toHref(entry.link);

  return (
    <div className="cv-entry" style={{ marginBottom: 'var(--cv-item-gap)' }}>
      <div className="cv-entry-head">
        <span className="cv-entry-title">
          {entry.name}
          {entry.role && <span className="cv-entry-sub"> &mdash; {entry.role}</span>}
        </span>
      </div>

      {entry.description && <p className="cv-text">{entry.description}</p>}

      {entry.technologies?.length > 0 && (
        <div className="cv-entry-sub">{entry.technologies.filter(Boolean).join(' · ')}</div>
      )}

      {href && (
        <div className="cv-entry-sub">
          <a href={href} className="cv-link">
            {entry.link.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * One entry in the Certifications section.
 * @param {{entry: object}} props
 */
export function CertificationEntry({ entry }) {
  const href = toHref(entry.credentialLink);

  return (
    <div className="cv-entry" style={{ marginBottom: 'var(--cv-item-gap)' }}>
      <div className="cv-entry-head">
        <span className="cv-entry-title">{entry.name}</span>
        {entry.date && <span className="cv-entry-date">{entry.date}</span>}
      </div>
      {entry.issuer && <div className="cv-entry-sub">{entry.issuer}</div>}
      {href && (
        <div className="cv-entry-sub">
          <a href={href} className="cv-link">
            View credential
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Skills, rendered either as pills or as plain text.
 *
 * The 'columns' variant is a bulleted list flowed into two CSS columns, the
 * arrangement the Banner and Monogram layouts use for a long skill list.
 *
 * The ATS template must use plain text: a screening system reads the text
 * layer of the PDF, and decorative pills add noise around each skill.
 *
 * The 'bars' and 'dots' variants show the level as a shape rather than a
 * word. Both keep the level as text for a screen reader, because a meter
 * drawn in CSS says nothing out loud, and a CV that reads as a bare list of
 * skills with no proficiency would lose information the user entered.
 *
 * @param {{skills: Array<object>,
 *          variant?: 'pills'|'plain'|'levelled'|'columns'|'bars'|'dots'}} props
 */
export function SkillList({ skills, variant = 'pills' }) {
  const named = skills.filter((skill) => skill.name?.trim());

  if (variant === 'plain') {
    return <p className="cv-text">{named.map((skill) => skill.name).join(', ')}</p>;
  }

  if (variant === 'columns') {
    return (
      <ul className="cv-skill-columns">
        {named.map((skill) => (
          <li key={skill._id ?? skill.name}>{skill.name}</li>
        ))}
      </ul>
    );
  }

  if (variant === 'bars' || variant === 'dots') {
    return (
      <div className="cv-skill-meters">
        {named.map((skill) => {
          const step = skillLevelStep(skill.level);

          return (
            <div key={skill._id ?? skill.name} className="cv-skill-meter">
              <span className="cv-meter-name">{skill.name}</span>

              {variant === 'bars' ? (
                <span className="cv-meter-track">
                  <span className="cv-meter-fill" style={{ width: `${step * 25}%` }} />
                </span>
              ) : (
                <span className="cv-dots">
                  {[1, 2, 3, 4].map((position) => (
                    <span
                      key={position}
                      className={position <= step ? 'cv-dot cv-dot-on' : 'cv-dot'}
                    />
                  ))}
                </span>
              )}

              {skill.level && <span className="cv-sr-only">{skill.level}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === 'levelled') {
    return (
      <div className="cv-skill-rows">
        {named.map((skill) => (
          <div key={skill._id ?? skill.name} className="cv-skill-row">
            <span>{skill.name}</span>
            <span className="cv-entry-date">{skill.level}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cv-pills">
      {named.map((skill) => (
        <span key={skill._id ?? skill.name} className="cv-pill">
          {skill.name}
        </span>
      ))}
    </div>
  );
}

/**
 * The Languages section.
 * @param {{languages: Array<object>}} props
 */
export function LanguageList({ languages }) {
  return (
    <div className="cv-skill-rows">
      {languages
        .filter((language) => language.language?.trim())
        .map((language) => (
          <div key={language._id ?? language.language} className="cv-skill-row">
            <span>{language.language}</span>
            {language.proficiency && <span className="cv-entry-date">{language.proficiency}</span>}
          </div>
        ))}
    </div>
  );
}

/**
 * The References section, which is either a list or the "available on
 * request" line.
 * @param {{cv: object}} props
 */
export function ReferenceList({ cv }) {
  if (cv.referencesOnRequest) {
    return <p className="cv-text">Available on request.</p>;
  }

  return (
    <div>
      {cv.references
        .filter((reference) => reference.name?.trim())
        .map((reference) => (
          <div
            key={reference._id ?? reference.name}
            className="cv-entry"
            style={{ marginBottom: 'var(--cv-item-gap)' }}
          >
            <div className="cv-entry-title">{reference.name}</div>
            {(reference.position || reference.company) && (
              <div className="cv-entry-sub">
                {[reference.position, reference.company].filter(Boolean).join(', ')}
              </div>
            )}
            {(reference.email || reference.phone) && (
              <div className="cv-entry-sub">
                {[reference.email, reference.phone].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

/**
 * Renders whichever section the key names, using the shared parts above.
 * Each template wraps this in its own heading style.
 *
 * @param {{cv: object, sectionKey: string, skillVariant?: string}} props
 */
export function SectionBody({ cv, sectionKey, skillVariant = 'pills' }) {
  switch (sectionKey) {
    case 'summary':
      return <p className="cv-text">{cv.summary}</p>;

    case 'experience':
      return cv.experience.map((entry) => (
        <ExperienceEntry key={entry._id ?? entry.position} entry={entry} />
      ));

    case 'education':
      return cv.education.map((entry) => (
        <EducationEntry key={entry._id ?? entry.institution} entry={entry} />
      ));

    case 'skills':
      return <SkillList skills={cv.skills} variant={skillVariant} />;

    case 'projects':
      return cv.projects.map((entry) => (
        <ProjectEntry key={entry._id ?? entry.name} entry={entry} />
      ));

    case 'certifications':
      return cv.certifications.map((entry) => (
        <CertificationEntry key={entry._id ?? entry.name} entry={entry} />
      ));

    case 'languages':
      return <LanguageList languages={cv.languages} />;

    case 'references':
      return <ReferenceList cv={cv} />;

    default:
      return null;
  }
}
