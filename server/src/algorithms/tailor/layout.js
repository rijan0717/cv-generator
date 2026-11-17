/**
 * Section order and page fill for the job-tailored rewrite.
 *
 * Decides which sections lead the draft, and whether what is left over
 * would fill another page or leave one half empty.
 */

import { PAGE_FILL_CONFIG, TAILOR_CONFIG } from '../../config/scoringConfig.js';
import { estimateFill } from '../pageFill.js';
import { relevanceOf, orderChanged } from './relevance.js';
import { buildSummary, listPhrase } from './summary.js';
import { focusOf, withFocusSentence } from './focus.js';

/**
 * Re-orders the movable sections so the most relevant is read first.
 *
 * Only the sections listed in `TAILOR_CONFIG.reorderableSections` move,
 * and they move only among the positions they already occupy — so
 * `summary` stays at the top, `references` stays at the bottom, and a
 * hidden section stays where it was.
 *
 * A margin stops near-equal sections from swapping on a rounding
 * difference, which would look like the feature misbehaving rather than
 * like a decision.
 *
 * @param {object} source - The original CV.
 * @param {object} draft - The tailored draft, whose content is measured.
 * @param {{weights: Map<string, number>, totalWeight: number}} profile
 * @param {(change: object) => void} record - Records the change, if any.
 * @returns {string[]} The new section order.
 */
export function orderSections(source, draft, profile, record) {
  const currentOrder = source.settings?.sectionOrder?.length
    ? [...source.settings.sectionOrder]
    : null;

  // No stored order means the CV uses the model's default, which the
  // draft inherits. Imposing one here would be a change the user never
  // asked for on a CV that has never been customised.
  if (!currentOrder) return draft.settings.sectionOrder;

  const movable = currentOrder.filter((key) => TAILOR_CONFIG.reorderableSections.includes(key));
  if (movable.length < 2) return currentOrder;

  /**
   * All of a section's text, as the draft now has it.
   * @param {string} key - The section name.
   * @returns {string} Its combined text.
   */
  const sectionText = (key) => {
    const value = draft[key];
    if (!Array.isArray(value)) return String(value ?? '');

    return value
      .map((entry) =>
        typeof entry === 'string'
          ? entry
          : Object.values(entry ?? {})
              .flat()
              .filter((field) => typeof field === 'string')
              .join(' '),
      )
      .join(' ');
  };

  const { sectionSwapMargin } = TAILOR_CONFIG;

  const ranked = [...movable]
    .map((key, originalIndex) => ({
      key,
      originalIndex,
      // Rounded to the margin, so sections within one margin of each
      // other compare equal and the stable sort leaves them alone.
      band: Math.round(relevanceOf(sectionText(key), profile) / sectionSwapMargin),
    }))
    .sort((a, b) => b.band - a.band);

  if (!orderChanged(ranked)) return currentOrder;

  // Put the re-ranked sections back into the slots the movable sections
  // occupied, leaving every other section exactly where it was.
  const reordered = [...currentOrder];
  const slots = currentOrder
    .map((key, index) => (TAILOR_CONFIG.reorderableSections.includes(key) ? index : -1))
    .filter((index) => index >= 0);

  slots.forEach((slot, position) => {
    reordered[slot] = ranked[position].key;
  });

  record({
    section: 'settings',
    field: 'sectionOrder',
    kind: 'reordered',
    before: currentOrder.join(' → '),
    after: reordered.join(' → '),
    reason: 'Put the sections with the most to say about this advert nearest the top.',
  });

  return reordered;
}

/**
 * Fills the page, as far as the user's own material allows.
 *
 * A rewrite that leaves half an A4 page blank has produced a document
 * that looks unfinished whatever it says, and the rest of this file had
 * no way of noticing. This step measures the draft against a page and,
 * when it falls short, pulls the levers it legitimately has — in order,
 * stopping the moment the page is full.
 *
 * The order is content first, then presentation:
 *
 *   1. **Show what is already there.** A section hidden in the settings
 *      but full of content is the cheapest thing on the page to find.
 *   2. **Let the summary run longer.** `buildSummary` normally stops at
 *      the word count the strength scorer rewards. Every sentence it
 *      could have added is built from a fact already on the CV, so
 *      raising the ceiling lengthens the summary without inventing
 *      anything — it only stops holding facts back.
 *   3. **Set the type larger.** Same words, more page. Nothing is
 *      claimed by an 11.5pt CV that was not claimed at 9.5pt.
 *
 * What it will **not** do is write experience the user does not have.
 * That is the line this whole module is built around, and a blank half
 * page is not a good enough reason to cross it: an employer reading an
 * invented paragraph is being deceived, and the candidate is the one who
 * has to defend it at interview. Where the levers run out, the step says
 * exactly what is missing and leaves the writing to the person whose CV
 * it is.
 *
 * @param {object} draft - The draft, modified in place.
 * @param {object} context - `{ source, summaryContext, record, notes }`.
 * @returns {object} The final fill estimate.
 */
export function fillPage(draft, { source, summaryContext, record, notes }) {
  const before = estimateFill(draft);
  if (before.isFull) return { ...before, startRatio: before.ratio };

  // --- Lever 1: sections that are hidden but have something in them ----
  const hidden = draft.settings.hiddenSections ?? [];
  const revealed = hidden.filter(
    (key) =>
      (estimateFill({ ...draft, settings: { ...draft.settings, hiddenSections: [] } }).sections[
        key
      ] ?? 0) > 0,
  );

  if (revealed.length > 0) {
    draft.settings.hiddenSections = hidden.filter((key) => !revealed.includes(key));
    record({
      section: 'settings',
      field: 'hidden sections',
      kind: 'reordered',
      after: revealed.join(', '),
      reason:
        `Your CV fills about ${Math.round(before.ratio * 100)}% of a page, and ` +
        `${listPhrase(revealed)} ${revealed.length === 1 ? 'was' : 'were'} hidden ` +
        'despite having content. Shown again so the page is not half empty.',
    });
  }

  if (estimateFill(draft).isFull) {
    return { ...estimateFill(draft), startRatio: before.ratio };
  }

  // --- Lever 2: let the summary say everything it can source -----------
  const longer = buildSummary(source, {
    ...summaryContext,
    maxWords: PAGE_FILL_CONFIG.expandedSummaryMaxWords,
    maxSkillsNamed: PAGE_FILL_CONFIG.expandedSummarySkills,
  });

  if (longer.text && longer.text.length > (draft.summary ?? '').length) {
    const previous = draft.summary;
    const focus = focusOf(previous);
    draft.summary = focus.length > 0 ? withFocusSentence(longer.text, focus) : longer.text;

    record({
      section: 'summary',
      kind: 'replaced',
      before: previous,
      after: draft.summary,
      reason:
        'Lengthened because the page was half empty. Every extra sentence is built from ' +
        'something already on your CV — your qualification, your skills, your own ' +
        'achievement — so nothing here is invented, it is only no longer left out.',
    });
  }

  if (estimateFill(draft).isFull) {
    return { ...estimateFill(draft), startRatio: before.ratio };
  }

  // --- Lever 3: larger type --------------------------------------------
  const sizes = ['small', 'medium', 'large'];
  const startedAt = draft.settings.fontSize ?? 'medium';
  let index = Math.max(0, sizes.indexOf(startedAt));

  while (index < sizes.length - 1 && !estimateFill(draft).isFull) {
    index += 1;
    draft.settings.fontSize = sizes[index];
  }

  if (draft.settings.fontSize !== startedAt) {
    record({
      section: 'settings',
      field: 'font size',
      kind: 'replaced',
      before: startedAt,
      after: draft.settings.fontSize,
      reason:
        'Set larger so the content fills the page rather than stopping half way down. ' +
        'This changes nothing about what your CV says — change it back in the builder ' +
        'if you prefer the smaller setting.',
    });
  }

  const after = estimateFill(draft);

  // --- What is left is content, and only the user can write it ---------
  if (!after.isFull) {
    notes.push(
      `Your CV fills about ${Math.round(after.ratio * 100)}% of an A4 page. The rewrite has ` +
        'gone as far as it honestly can — it will not invent experience you do not have, so ' +
        `the rest is yours to write. ${whatWouldFillIt(draft, after)}`,
    );
  }

  return { ...after, startRatio: before.ratio };
}

/**
 * The most useful thing the user could add, given what is thin.
 *
 * Specific advice, not "add more": the sections are ranked by what a
 * reader of a CV actually misses, and the first one that is empty or
 * nearly empty is named. A prompt a user can act on in a minute is worth
 * more than an accurate description of the problem.
 *
 * @param {object} draft - The draft as it stands.
 * @param {object} fill - Its fill estimate.
 * @returns {string} One sentence of advice.
 */
export function whatWouldFillIt(draft, fill) {
  const roles = (draft.experience ?? []).length;
  const thinRoles = (draft.experience ?? []).filter(
    (role) => (role?.achievements ?? []).filter(Boolean).length < 2,
  );

  if (roles === 0) {
    return 'Adding a role, or a project you built, would fill most of what is missing.';
  }

  if (thinRoles.length > 0) {
    const named = thinRoles[0].position || 'your most recent role';
    return (
      `Two or three more bullet points under ${named} — what you did, and what changed ` +
      'because you did it — would fill most of it.'
    );
  }

  if ((draft.projects ?? []).length === 0) {
    return 'A projects section is usually the quickest way to fill the rest.';
  }

  if ((draft.certifications ?? []).length === 0) {
    return 'Certifications or training would fill some of the rest.';
  }

  return `About ${Math.ceil(fill.shortfallLines)} more lines of content would fill it.`;
}
