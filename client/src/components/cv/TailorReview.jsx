import { useState } from 'react';
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
    <div className="space-y-6">
      <ScoreComparison comparison={result.comparison} />

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
        <TextArea
          label="Summary"
          value={draft.summary ?? ''}
          rows={5}
          onChange={(value) => setField('summary', value)}
        />
      </EditableSection>

      <SkillsEditor
        skills={draft.skills ?? []}
        suggested={result.suggestedSkills ?? []}
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
    </div>
  );
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
function SkillsEditor({ skills, suggested, onChange }) {
  const listed = new Set(skills.map((skill) => skill.name));
  const stillMissing = suggested.filter((name) => !listed.has(name));

  return (
    <EditableSection
      title="Skills"
      hint="The skills this advert asks for have been moved to the front."
    >
      <ul className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <li
            key={skill._id ?? `${skill.name}-${index}`}
            className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-3 pr-1 text-sm dark:bg-slate-800"
          >
            <span className="text-slate-800 dark:text-slate-200">{skill.name}</span>
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
