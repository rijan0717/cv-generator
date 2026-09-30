/**
 * Small building blocks the templates share.
 *
 * Each template decides its own layout and heading style, but the content of
 * an experience entry or a skill list is the same everywhere, so it is
 * written once here. Anything visual is driven by the CSS variables set in
 * `buildTemplateVariables`, never hard-coded.
 */
import { formatDateRange, toHref } from './templateUtils.js';

/**
 * One entry in the Experience section.
 * @param {{entry: object, showAchievements?: boolean}} props
 */
export function ExperienceEntry({ entry, showAchievements = true }) {
  const range = formatDateRange(entry.startDate, entry.endDate, entry.isCurrent);

  return (
    <div style={{ marginBottom: 'var(--cv-item-gap)' }}>
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
    <div style={{ marginBottom: 'var(--cv-item-gap)' }}>
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
    <div style={{ marginBottom: 'var(--cv-item-gap)' }}>
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
    <div style={{ marginBottom: 'var(--cv-item-gap)' }}>
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
 * @param {{skills: Array<object>, variant?: 'pills'|'plain'|'levelled'|'columns'}} props
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
          <div key={reference._id ?? reference.name} style={{ marginBottom: 'var(--cv-item-gap)' }}>
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
