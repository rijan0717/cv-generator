import { sampleContent } from '../templates/sampleCV.js';
import { settingsForTemplate, getTemplate } from '../templates/index.js';
import * as cvApi from '../api/cvs.js';

/**
 * The CV a visitor builds before they have an account.
 *
 * Unlike the public rewrite funnel, there is nothing here to hide from
 * the person using it: every word is their own and they are looking at
 * it while they type. So the draft lives in their browser rather than on
 * the server, which means no record of a stranger's CV exists until they
 * decide to keep it — the strongest version of "nothing is stored unless
 * you ask".
 *
 * `localStorage` rather than `sessionStorage`, because this draft is
 * meant to survive the trip to the registration page, the welcome step
 * and, if they close the tab halfway through writing their work history,
 * coming back tomorrow.
 */
const DRAFT_KEY = 'cvg.publicDraft';

/**
 * Starts a draft in one template, filled with that template's sample
 * content for the visitor to type over.
 *
 * The same starting point the signed-in builder uses, built locally: a
 * blank form asks someone to imagine the finished thing, which is the
 * hardest moment in writing a CV and the worst place to put it.
 *
 * @param {string} templateKey - The chosen template.
 * @returns {object} A CV-shaped plain object.
 */
export function startDraft(templateKey) {
  const template = getTemplate(templateKey);

  return {
    title: `${template?.name ?? 'My'} CV`,
    templateKey,
    ...sampleContent(templateKey, {}),
    settings: settingsForTemplate({}, template),
  };
}

/**
 * Re-skins a draft without touching a word the visitor has written.
 *
 * Only the template key and the presentation settings change. Switching
 * design is a question about how the CV looks, and answering it by
 * replacing the content would throw away the part that took effort.
 *
 * @param {object} draft - The draft so far.
 * @param {string} templateKey - The newly chosen template.
 * @returns {object} The draft in the new template.
 */
export function withTemplate(draft, templateKey) {
  const template = getTemplate(templateKey);

  return {
    ...draft,
    templateKey,
    settings: settingsForTemplate(draft.settings ?? {}, template),
  };
}

/**
 * Saves the draft in the browser. Failure is ignored on purpose: a
 * visitor with storage blocked can still build and export a CV, they
 * just lose it if they navigate away.
 *
 * @param {object} draft - The draft to keep.
 */
export function rememberDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Private mode, or a full quota. Nothing useful to do here.
  }
}

/**
 * The remembered draft, if there is one.
 * @returns {object|null}
 */
export function rememberedDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
  } catch {
    return null;
  }
}

/** Forgets the draft, once it has been saved to an account. */
export function forgetDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // An unreadable store is also an unwritable one.
  }
}

/**
 * Where to send someone who has just signed up, if a draft is waiting.
 *
 * A brand-new account goes through the welcome step before it lands
 * anywhere, so "take them back where they were" cannot be left to the
 * usual `from` state. The pages that decide where a new user starts ask
 * this first.
 *
 * @returns {string|null} The path to land on, or null for the usual one.
 */
export function pendingDraftPath() {
  return rememberedDraft() ? '/build-cv' : null;
}

/**
 * Saves a finished draft to the signed-in account as a real CV.
 *
 * Two requests, the same pair `createStarterCV` uses: `POST` makes the
 * CV, `PUT` fills it through the ordinary save path, so the content is
 * validated and the strength score worked out exactly as it would be for
 * anything typed in the builder. Nothing here needs an endpoint of its
 * own — the draft is just a CV that has not been saved yet.
 *
 * @param {object} draft - The draft the visitor built.
 * @returns {Promise<object>} The saved CV.
 */
export async function saveDraftToAccount(draft) {
  const created = await cvApi.createCV({
    title: draft.title || 'My CV',
    templateKey: draft.templateKey,
  });

  return cvApi.updateCV(created._id, {
    // The account's own name and email are already on the created CV.
    // They only win where the visitor left the field alone, so someone
    // who typed a different name keeps the one they typed.
    personal: {
      ...draft.personal,
      fullName: draft.personal?.fullName || created.personal?.fullName || '',
      email: draft.personal?.email || created.personal?.email || '',
    },
    summary: draft.summary,
    experience: draft.experience,
    education: draft.education,
    skills: draft.skills,
    projects: draft.projects,
    certifications: draft.certifications,
    languages: draft.languages,
    references: draft.references,
    referencesOnRequest: draft.referencesOnRequest,
    settings: draft.settings,
  });
}
