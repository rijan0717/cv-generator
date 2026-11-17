import { useState } from 'react';
import { ChangeRow, RewriteOverview } from './tailor/ChangeList.jsx';
import { CarriedOverSections, DraftPreview } from './tailor/DraftPreview.jsx';
import { PageFillPanel, ScoreComparison } from './tailor/ScorePanels.jsx';
import { SkillsEditor, listOf } from './tailor/SkillsEditor.jsx';
import { EditableSection, TextArea } from './tailor/fields.jsx';
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
    // Two equal columns, as in the builder. A 340px rail scaled the A4
    // page down to roughly a third of its width, which is too small to
    // read — and reading the document is the whole purpose of a review
    // screen.
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="space-y-6">
        <ScoreComparison comparison={result.comparison} />

        <RewriteOverview changes={result.changes} />

        <PageFillPanel fill={result.pageFill} />

        <section className="rounded-xl bg-white dark:bg-navy-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-navy-700">
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

        <section className="rounded-xl bg-white dark:bg-navy-900 shadow-sm ring-1 ring-slate-200 dark:ring-navy-700">
          <button
            type="button"
            onClick={() => setShowChanges((open) => !open)}
            aria-expanded={showChanges}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {result.changes.length} change{result.changes.length === 1 ? '' : 's'} made
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-100">
              {showChanges ? 'Hide' : 'Show'}
            </span>
          </button>

          {showChanges && (
            <ul className="space-y-3 border-t border-slate-200 px-5 py-4 dark:border-navy-700">
              {result.changes.length === 0 && (
                <li className="text-sm text-slate-600 dark:text-slate-100">
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
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
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
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
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
