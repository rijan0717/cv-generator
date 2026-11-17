/** The skills list, where the user accepts or removes what the rewrite suggested. */

import { useState } from 'react';

/** The levels the CV model allows, as the builder offers them. */
export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
import Button from '../../ui/Button.jsx';
import { EditableSection } from './fields.jsx';

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
export function SkillsEditor({ skills, suggested, assumed, onChange }) {
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
                : 'bg-slate-100 dark:bg-navy-800',
            ].join(' ')}
          >
            <span
              className={
                isAssumed.has(skill.name)
                  ? 'text-violet-900 dark:text-violet-200'
                  : 'text-slate-800 dark:text-slate-50'
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
              className="rounded-full px-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-50"
            >
              <span aria-hidden="true">×</span>
              <span className="sr-only">Remove {skill.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <AddSkill skills={skills} onChange={onChange} />
      {stillMissing.length > 0 && (
        <div className="mt-5 rounded-lg bg-amber-50 p-4 dark:bg-amber-50/40">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-800">
            This advert also asks for these, and they appear nowhere on your CV
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-700">
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
export function AddSkill({ skills, onChange }) {
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
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-100">
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
            className="mt-1 block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 dark:bg-navy-800 dark:text-slate-50 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
        </label>

        <label>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-100">
            Level
          </span>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="mt-1 rounded-lg border-0 py-2 pl-2 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-navy-800 dark:text-slate-50 dark:ring-slate-600 dark:focus:ring-slate-100"
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
        <p className="mt-1.5 text-sm text-amber-700 dark:text-amber-600">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-100">
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
export function listOf(names) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}
