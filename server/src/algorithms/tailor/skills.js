/**
 * Skills section for the job-tailored rewrite.
 *
 * Reorders the user's own skills so the ones this advert asks for come
 * first, and renames them to the advert's spelling where the dictionary
 * says the two are the same skill.
 */

import { TAILOR_CONFIG } from '../../config/scoringConfig.js';
import { normaliseText, tokenise } from '../textProcessor.js';
import { findSkills } from '../../data/skillsDictionary.js';
import { processText, cvToText } from '../textProcessor.js';
import { skillsFromSection } from '../jobMatcher.js';

/**
 * Works out what should happen to the skills section.
 *
 * Three groups come out of this, and the difference between them is the
 * whole ethical question the feature raises:
 *
 *   - **Promoted.** Skills the user already lists that this advert asks
 *     for. Moved to the front; nothing added.
 *   - **Added.** Skills the advert asks for that the CV describes
 *     somewhere — in a role, a project, a certification — but never puts
 *     in the skills list. Added, because the user has already claimed
 *     them in their own words and a screening system reads the list.
 *   - **Suggested.** Skills the advert asks for that appear nowhere at
 *     all. Never added. Returned for the user to consider.
 *
 * @param {object} cv - The source CV.
 * @param {string} jobText - The advert.
 * @returns {{skills: Array<object>, promoted: string[], added: string[],
 *            suggested: string[]}}
 */
export function tailorSkills(cv, jobText) {
  const jobSkills = findSkills(jobText, tokenise(normaliseText(jobText)));
  const listed = skillsFromSection(cv);

  const cvText = cvToText(cv);
  const evidenced = findSkills(cvText, tokenise(normaliseText(cvText)));

  // The dictionary only knows exact spellings, so "accounts payable" and
  // "budgets" did not count as evidence for Accounting and Budgeting, and
  // the rewrite then told an accountant that her CV never mentions
  // accounting. Comparing stems as well catches these. Very short stems
  // are skipped, because "go" or "r" would be found in almost any text.
  const cvTerms = new Set(processText(cvText));
  for (const skill of jobSkills) {
    const stems = processText(skill);
    if (stems.length > 0 && stems.every((stem) => stem.length >= 4 && cvTerms.has(stem))) {
      evidenced.add(skill);
    }
  }

  const promoted = [];
  const added = [];
  const suggested = [];

  for (const skill of jobSkills) {
    if (listed.has(skill)) promoted.push(skill);
    else if (evidenced.has(skill)) added.push(skill);
    else suggested.push(skill);
  }

  const toAdd = added.slice(0, TAILOR_CONFIG.skills.maxAutoAdded);

  // Skills this advert asks for come first, then everything else in the
  // order the user had them. A recruiter reads the first line of the
  // section; this puts the answer to their question there.
  const wanted = new Set(promoted);
  const existing = cv.skills ?? [];

  const skills = [
    ...existing.filter((skill) => wanted.has(canonicalOf(skill))),
    ...existing.filter((skill) => !wanted.has(canonicalOf(skill))),
    // A level has to be chosen for an added skill and the CV does not say
    // what it should be. "Intermediate" is the builder's own default and
    // the least likely to overstate anything; the user sets it properly
    // in the review step.
    ...toAdd.map((name) => ({ name, level: 'Intermediate' })),
  ];

  return {
    skills,
    promoted,
    added: toAdd,
    suggested: suggested.slice(0, TAILOR_CONFIG.skills.maxSuggested),
  };
}

/**
 * The canonical name of a skill entry, falling back to what was typed.
 * @param {{name?: string}} skill - A skills-section entry.
 * @returns {string} The canonical name, or the raw name.
 */
export function canonicalOf(skill) {
  const raw = skill?.name ?? '';
  const found = findSkills(raw, tokenise(normaliseText(raw)));
  return found.size === 1 ? [...found][0] : raw;
}

// --- The rewrite -----------------------------------------------------------
