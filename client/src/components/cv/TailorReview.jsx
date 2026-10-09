import { useState } from 'react';
import CVPreview from './CVPreview.jsx';

/** The levels the CV model allows, as the builder offers them. */
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
import Button from '../ui/Button.jsx';
import TextField from '../ui/TextField.jsx';
import Alert from '../ui/Alert.jsx';

/**
 * The review step of the Job-Tailored CV Rewrite.
 *
 * Everything the rewrite produced is editable here, and nothing has been
 * saved yet. That is the whole purpose of the screen: the rewrite is an
 * algorithm re-ordering and re-wording the user's own words, and it has
 * no idea whether the result reads well. The user is the one who knows.
 *
 * The changes are listed before the fields, with the reason for each,
 * rather than being presented as a finished document to accept or
 * reject. A user who can see *why* their summary was replaced can judge
 * whether to keep it; one who only sees the new summary cannot.
 *
 * @param {{result: object, draft: object, onChange: (draft: object) => void,
 *          title: string, onTitleChange: (title: string) => void}} props
 */
export default function TailorReview({ result, draft, onChange, title, onTitleChange }) {
  const [showChanges, setShowChanges] = useState(true);

  /**
   * Replaces one top-level field of the draft.
   * @param {string} field - The field name.
   * @param {*} value - Its new value.
   */
  const setField = (field, value) => onChange({ ...draft, [field]: value });

  /**
   * Replaces one entry of a repeatable section.
   * @param {string} section - The section name, e.g. "experience".
   * @param {number} index - Which entry.
   * @param {object} patch - The fields to change on it.
   */
  const patchEntry = (section, index, patch) => {
    const next = [...(draft[section] ?? [])];
    next[index] = { ...next[index], ...patch };
    setField(section, next);
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
      <div className="space-y-6">
        <ScoreComparison comparison={result.comparison} />

        <PageFillPanel fill={result.pageFill} />

        <section className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
          <TextField
            label="Title for the new CV"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            hint="This is how it will appear in My CVs. Your original CV is not changed."
            maxLength={100}
          />
        </section>

        {result.notes?.length > 0 && (
          <Alert variant="info">
            <p className="font-medium">Things the rewrite could not do for you</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Alert>
        )}

        <section className="rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
          <button
            type="button"
            onClick={() => setShowChanges((open) => !open)}
            aria-expanded={showChanges}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {result.changes.length} change{result.changes.length === 1 ? '' : 's'} made
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {showChanges ? 'Hide' : 'Show'}
            </span>
          </button>

          {showChanges && (
            <ul className="space-y-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              {result.changes.length === 0 && (
                <li className="text-sm text-slate-600 dark:text-slate-400">
                  Your CV already reads well against this advert. Nothing needed changing.
                </li>
              )}
              {result.changes.map((change, index) => (
                <ChangeRow key={`${change.section}-${index}`} change={change} />
              ))}
            </ul>
          )}
        </section>

        <EditableSection title="Headline">
          <TextField
            label="Headline"
            value={draft.personal?.headline ?? ''}
            onChange={(event) =>
              setField('personal', { ...draft.personal, headline: event.target.value })
            }
          />
        </EditableSection>

        <EditableSection
          title="Professional summary"
          hint="Assembled from facts already on your CV. Read it as a first draft, not a finished paragraph."
        >
          {result.focusTerms?.length > 0 && (
            <div className="mb-4 rounded-lg bg-violet-50 p-4 dark:bg-violet-950/40">
              <p className="text-sm font-medium text-violet-900 dark:text-violet-200">
                A “Focus for this role” line was added to reach the target match
              </p>
              <p className="mt-1 text-sm text-violet-800 dark:text-violet-300">
                It lists {listOf(result.focusTerms)} — the advert’s own words for the work, which
                your CV never uses. Matching an advert’s language is most of what a screening system
                measures, but these are its words, not yours: keep only the ones that describe work
                you have actually done, and reword the line so it sounds like you.
              </p>
            </div>
          )}

          <TextArea
            label="Summary"
            value={draft.summary ?? ''}
            rows={6}
            onChange={(value) => setField('summary', value)}
          />
        </EditableSection>

        <SkillsEditor
          skills={draft.skills ?? []}
          suggested={result.suggestedSkills ?? []}
          assumed={result.assumedSkills ?? []}
          onChange={(skills) => setField('skills', skills)}
        />

        {(draft.experience ?? []).length > 0 && (
          <EditableSection title="Experience">
            <div className="space-y-6">
              {draft.experience.map((role, index) => (
                <div key={role._id ?? index} className="space-y-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {role.position || 'Role'}
                    {role.company ? ` — ${role.company}` : ''}
                  </p>

                  <TextArea
                    label="Description"
                    value={role.description ?? ''}
                    rows={3}
                    onChange={(value) => patchEntry('experience', index, { description: value })}
                  />

                  {(role.achievements ?? []).map((achievement, achievementIndex) => (
                    <TextField
                      key={achievementIndex}
                      label={`Achievement ${achievementIndex + 1}`}
                      value={achievement}
                      onChange={(event) => {
                        const achievements = [...role.achievements];
                        achievements[achievementIndex] = event.target.value;
                        patchEntry('experience', index, { achievements });
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </EditableSection>
        )}

        {(draft.projects ?? []).length > 0 && (
          <EditableSection
            title="Projects"
            hint="Re-ordered so the projects closest to this advert come first."
          >
            <div className="space-y-4">
              {draft.projects.map((project, index) => (
                <div key={project._id ?? index} className="space-y-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {project.name || `Project ${index + 1}`}
                  </p>
                  <TextArea
                    label="Description"
                    value={project.description ?? ''}
                    rows={3}
                    onChange={(value) => patchEntry('projects', index, { description: value })}
                  />
                </div>
              ))}
            </div>
          </EditableSection>
        )}
        <CarriedOverSections draft={draft} />
      </div>

      <DraftPreview draft={draft} />
    </div>
  );
}

/**
 * How much of an A4 page the draft fills, and what would fill the rest.
 *
 * Shown because a half-empty page is the most visible thing about a CV
 * and the one the rewrite can do least about. The bar makes the gap
 * obvious at a glance; the sentence beside it says the rewrite has
 * stopped rather than that it failed, which is the honest description:
 * everything the algorithm could do with the user's own material has
 * been done, and what is left needs facts only they have.
 *
 * Nothing is shown once the page is full. A green "you are fine" panel on
 * every rewrite is noise, and the user has the preview beside them.
 *
 * @param {{fill: object}} props - The `pageFill` estimate from the server.
 */
function PageFillPanel({ fill }) {
  if (!fill || fill.isFull) return null;

  const percent = Math.round(fill.ratio * 100);
  const started = Number.isFinite(fill.startRatio) ? Math.round(fill.startRatio * 100) : null;
  const gained = started !== null ? percent - started : 0;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-amber-200 dark:bg-slate-900 dark:ring-amber-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">
          This fills about {percent}% of a page
        </h2>

        {gained > 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            up from {started}% before the rewrite
          </p>
        )}
      </div>

      {/* The bar is decoration over the number, never instead of it. */}
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="img"
        aria-label={`${percent} per cent of an A4 page is filled`}
      >
        <div
          className="h-full rounded-full bg-amber-400 dark:bg-amber-500"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        The rewrite has filled what it can from your own material — it lengthened the summary with
        facts already on your CV and set the type larger. It will not write experience you do not
        have, so the rest of the page is yours. Add it in the builder after saving, or in your
        original CV before rewriting again.
      </p>
    </section>
  );
}

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
function DraftPreview({ draft }) {
  return (
    <aside className="mt-6 lg:sticky lg:top-6 lg:mt-0">
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Live preview</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          The tailored CV as it will be saved. It updates as you edit.
        </p>

        <div className="mt-3 max-h-[75vh] overflow-y-auto rounded-lg bg-slate-200/60 p-3 dark:bg-slate-800/60">
          <CVPreview cv={draft} />
        </div>
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
function CarriedOverSections({ draft }) {
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
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {section.title}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {section.entries.map((entry) => (
                <li key={entry.key} className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{entry.heading || 'Untitled'}</span>
                  {entry.detail && (
                    <span className="text-slate-500 dark:text-slate-400"> — {entry.detail}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {draft.referencesOnRequest && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
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
function formatYears({ startDate, endDate }) {
  const start = String(startDate ?? '').slice(0, 4);
  const end = String(endDate ?? '').slice(0, 4);

  if (!start && !end) return '';
  if (!end) return `${start}–present`;
  return start === end ? start : `${start}–${end}`;
}

/**
 * The match score before and after, side by side.
 *
 * Shown first and shown honestly: if the rewrite did not improve the
 * score, that is what the user sees. A feature that only ever reported
 * good news would be worth nothing.
 *
 * @param {{comparison: {before: object, after: object}}} props
 */
function ScoreComparison({ comparison }) {
  const { before, after } = comparison;
  const difference = after.matchScore - before.matchScore;

  return (
    <section className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Match against this job</h2>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Figure label="Before" value={before.matchScore} band={before.band} />
        <span aria-hidden="true" className="text-2xl text-slate-300 dark:text-slate-600">
          →
        </span>
        <Figure label="After" value={after.matchScore} band={after.band} />

        <p
          className={[
            'rounded-full px-3 py-1 text-sm font-medium',
            difference > 0
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : difference < 0
                ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          ].join(' ')}
        >
          {difference > 0 ? `+${difference}` : difference} points
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        CV strength {before.strengthScore} → {after.strengthScore} out of 100.
      </p>
    </section>
  );
}

/**
 * One score with its band label.
 * @param {{label: string, value: number, band: string}} props
 */
function Figure({ label, value, band }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{band}</p>
    </div>
  );
}

/**
 * One entry in the list of changes, with its before and after.
 * @param {{change: object}} props
 */
function ChangeRow({ change }) {
  return (
    <li className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
      <p className="font-medium text-slate-900 dark:text-slate-100">
        <span className="capitalize">{change.section}</span>
        {change.field ? ` · ${change.field}` : ''}
        <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-normal capitalize text-slate-700 dark:bg-slate-700 dark:text-slate-300">
          {change.kind}
        </span>
      </p>

      <p className="mt-1 text-slate-600 dark:text-slate-400">{change.reason}</p>

      {change.before ? (
        <p className="mt-2 text-slate-500 line-through dark:text-slate-500">{change.before}</p>
      ) : null}
      {change.after ? (
        <p className="mt-1 text-slate-800 dark:text-slate-200">{change.after}</p>
      ) : null}
    </li>
  );
}

/**
 * The skills section, with the skills the advert asked for that the CV
 * could not evidence offered as optional additions.
 *
 * They are offered rather than added, and the wording says so. The
 * rewrite will not claim a skill on the user's behalf.
 *
 * @param {{skills: Array<object>, suggested: string[],
 *          onChange: (skills: Array<object>) => void}} props
 */
function SkillsEditor({ skills, suggested, assumed, onChange }) {
  const listed = new Set(skills.map((skill) => skill.name));
  const stillMissing = suggested.filter((name) => !listed.has(name));

  const isAssumed = new Set(assumed);
  const assumedStillListed = assumed.filter((name) => listed.has(name));

  return (
    <EditableSection
      title="Skills"
      hint="The skills this advert asks for have been moved to the front."
    >
      {assumedStillListed.length > 0 && (
        <div className="mb-4 rounded-lg bg-violet-50 p-4 dark:bg-violet-950/40">
          <p className="text-sm font-medium text-violet-900 dark:text-violet-200">
            {assumedStillListed.length} skill
            {assumedStillListed.length === 1 ? ' was' : 's were'} assumed to reach the target match
          </p>
          <p className="mt-1 text-sm text-violet-800 dark:text-violet-300">
            Your CV does not mention {listOf(assumedStillListed)} anywhere, so{' '}
            {assumedStillListed.length === 1 ? 'this is a guess' : 'these are guesses'}, not
            something the rewrite found. Remove any you do not have — the match score will fall, and
            it should.
          </p>
        </div>
      )}

      <ul className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <li
            key={skill._id ?? `${skill.name}-${index}`}
            className={[
              'flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-sm',
              isAssumed.has(skill.name)
                ? 'bg-violet-100 ring-1 ring-violet-300 dark:bg-violet-950 dark:ring-violet-800'
                : 'bg-slate-100 dark:bg-slate-800',
            ].join(' ')}
          >
            <span
              className={
                isAssumed.has(skill.name)
                  ? 'text-violet-900 dark:text-violet-200'
                  : 'text-slate-800 dark:text-slate-200'
              }
            >
              {skill.name}
              {isAssumed.has(skill.name) && (
                <>
                  {' '}
                  <span className="text-xs font-medium opacity-70">assumed</span>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => onChange(skills.filter((_, position) => position !== index))}
              className="rounded-full px-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove {skill.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <AddSkill skills={skills} onChange={onChange} />
      {stillMissing.length > 0 && (
        <div className="mt-5 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            This advert also asks for these, and they appear nowhere on your CV
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            They have not been added. Add only the ones you genuinely have.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {stillMissing.map((name) => (
              <Button
                key={name}
                size="sm"
                variant="secondary"
                onClick={() => onChange([...skills, { name, level: 'Intermediate' }])}
              >
                + {name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </EditableSection>
  );
}

/**
 * Adds a skill the rewrite did not think of.
 *
 * The review could already remove a skill and accept one the advert asked
 * for, but there was no way to type one in — so a user who spotted that
 * their CV had never listed something they genuinely do had to save the
 * draft, open the builder and add it there, by which point the match
 * score beside it was describing a different document.
 *
 * It is a real form rather than an input with a click handler, so Enter
 * submits it. Typing a skill and pressing Enter is what everybody tries
 * first, and a form is the only thing that makes it work without
 * reimplementing keyboard handling.
 *
 * A duplicate is refused rather than silently ignored. Silently dropping
 * what somebody typed reads as the control being broken; saying the skill
 * is already listed answers the question they actually have.
 *
 * @param {{skills: Array<object>, onChange: (skills: Array<object>) => void}} props
 */
function AddSkill({ skills, onChange }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('Intermediate');
  const [error, setError] = useState('');

  /**
   * Adds the typed skill, if it is worth adding.
   * @param {React.FormEvent} event - The submit.
   */
  function submit(event) {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    // Case-insensitively, because "node.js" and "Node.js" are one skill
    // and listing both would look careless to the reader of the CV.
    const already = skills.some((skill) => skill.name.toLowerCase() === trimmed.toLowerCase());

    if (already) {
      setError(`${trimmed} is already listed.`);
      return;
    }

    onChange([...skills, { name: trimmed, level }]);
    setName('');
    setError('');
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[160px] flex-1">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Add a skill
          </span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            maxLength={60}
            placeholder="e.g. Kubernetes"
            className="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
        </label>

        <label>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Level
          </span>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="mt-1 rounded-lg border-0 py-2 pl-2 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          >
            {SKILL_LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" size="sm" variant="secondary" disabled={!name.trim()}>
          Add
        </Button>
      </div>

      {error ? (
        <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-400">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Only add skills you actually have. The match score counts them, and so will the interview.
        </p>
      )}
    </form>
  );
}

/**
 * Joins names the way a sentence does: "a, b and c".
 * @param {string[]} names - The names.
 * @returns {string} The joined phrase.
 */
function listOf(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * A titled card around one editable part of the draft.
 * @param {{title: string, hint?: string, children: React.ReactNode}} props
 */
function EditableSection({ title, hint, children }) {
  return (
    <section className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * A labelled multi-line field, matching `TextField` for a single line.
 *
 * `TextField` renders an `<input>`, and a rewritten description is
 * several sentences long, so it needs its own component rather than a
 * taller input.
 *
 * @param {{label: string, value: string, rows?: number,
 *          onChange: (value: string) => void}} props
 */
function TextArea({ label, value, rows = 4, onChange }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
      />
    </label>
  );
}
