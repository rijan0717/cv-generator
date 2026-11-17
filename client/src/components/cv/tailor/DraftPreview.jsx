/** The draft as the employer would read it, and the sections carried across untouched. */

import CVPreview from '../CVPreview.jsx';
import { EditableSection } from './fields.jsx';

/**
 * The live A4 preview of the draft, beside the fields that edit it.
 *
 * Two reasons it is here rather than left to the builder after saving.
 *
 * The first is that a rewrite is a change to a document, and a list of
 * changed sentences is not a document. A user deciding whether to keep a
 * rewritten summary is really asking how the page reads with it, and
 * until now they could only find that out by saving first.
 *
 * The second is the screen itself. The review was a single narrow column
 * of form fields with the whole right-hand side of a desktop window left
 * empty, which read as though the feature had failed to load something.
 *
 * It renders through the same `CVPreview` as the builder, so the page
 * shown here is geometrically the PDF — the preview scales, it does not
 * reflow. Below `lg` it moves under the fields rather than disappearing:
 * on a phone the whole screen is one column anyway.
 *
 * @param {{draft: object}} props
 */
export function DraftPreview({ draft }) {
  return (
    // The same furniture as the builder's preview — the heading on the
    // left, the sheet size on the right, the page on a grey surface —
    // so the rewrite review and the editor read as one feature rather
    // than two screens that happen to show a CV.
    <aside className="mt-6 lg:sticky lg:top-6 lg:mt-0 lg:self-start">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Preview</h2>
        <span className="text-xs text-slate-500 dark:text-slate-100">
          A4 &middot; 210 &times; 297 mm
        </span>
      </div>

      <p className="mb-3 text-xs text-slate-500 dark:text-slate-100">
        The tailored CV as it will be saved. It updates as you edit.
      </p>

      <div className="rounded-xl bg-slate-200/60 p-4 dark:bg-navy-800/60 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
        <CVPreview cv={draft} />
      </div>
    </aside>
  );
}

/**
 * The sections the rewrite did not touch, shown read-only.
 *
 * Education, certifications, languages and references are facts, not
 * phrasing: there is nothing in them for a rewrite aimed at one advert to
 * improve, so they are carried across exactly as they were. They are
 * still shown, because a review screen that lists only the changed parts
 * invites the reader to assume the rest was dropped — and because the
 * whole CV is what they are about to save.
 *
 * Read-only on purpose. Editing the facts of a degree belongs in the
 * builder, which opens on this CV the moment it is saved, and putting a
 * second editor for them here would be two places to change one thing.
 *
 * @param {{draft: object}} props
 */
export function CarriedOverSections({ draft }) {
  const sections = [
    {
      key: 'education',
      title: 'Education',
      entries: (draft.education ?? []).map((entry) => ({
        key: entry._id ?? entry.institution,
        heading: [entry.degree, entry.fieldOfStudy].filter(Boolean).join(', '),
        detail: [entry.institution, formatYears(entry)].filter(Boolean).join(' · '),
      })),
    },
    {
      key: 'certifications',
      title: 'Certifications',
      entries: (draft.certifications ?? []).map((entry) => ({
        key: entry._id ?? entry.name,
        heading: entry.name,
        detail: [entry.issuer, entry.date].filter(Boolean).join(' · '),
      })),
    },
    {
      key: 'languages',
      title: 'Languages',
      entries: (draft.languages ?? []).map((entry) => ({
        key: entry._id ?? entry.language,
        heading: entry.language,
        detail: entry.proficiency ?? '',
      })),
    },
    {
      key: 'references',
      title: 'References',
      entries: (draft.references ?? []).map((entry) => ({
        key: entry._id ?? entry.name,
        heading: entry.name,
        detail: [entry.position, entry.company].filter(Boolean).join(', '),
      })),
    },
  ].filter((section) => section.entries.length > 0);

  if (sections.length === 0 && !draft.referencesOnRequest) return null;

  return (
    <EditableSection
      title="Carried over unchanged"
      hint="These are facts rather than phrasing, so the rewrite left them exactly as they were. Edit them in the builder after saving."
    >
      <div className="space-y-5">
        {sections.map((section) => (
          <div key={section.key}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {section.title}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {section.entries.map((entry) => (
                <li key={entry.key} className="text-sm text-slate-700 dark:text-slate-100">
                  <span className="font-medium">{entry.heading || 'Untitled'}</span>
                  {entry.detail && (
                    <span className="text-slate-500 dark:text-slate-100"> — {entry.detail}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {draft.referencesOnRequest && (
          <p className="text-sm text-slate-600 dark:text-slate-100">
            References available on request.
          </p>
        )}
      </div>
    </EditableSection>
  );
}

/**
 * The years an education entry covers, for the read-only list.
 *
 * Years only: the review is a glance, and a full date range would crowd
 * the line without telling the reader anything they are deciding on.
 *
 * @param {{startDate?: string, endDate?: string}} entry - One entry.
 * @returns {string} e.g. "2019–2023", or "" when no dates are set.
 */
export function formatYears({ startDate, endDate }) {
  const start = String(startDate ?? '').slice(0, 4);
  const end = String(endDate ?? '').slice(0, 4);

  if (!start && !end) return '';
  if (!end) return `${start}–present`;
  return start === end ? start : `${start}–${end}`;
}
