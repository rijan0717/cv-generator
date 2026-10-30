/**
 * The invented CVs the template gallery renders its thumbnails with.
 *
 * A gallery that drew each template with the user's own CV would show a
 * half-filled CV forty times over, and every template would look empty.
 * Each sample has something in every section, at the length a real CV
 * has, and every template gets a different person (samplePeople.js), so
 * the gallery looks like a set of real CVs rather than one CV repeated.
 */

import { SAMPLE_PEOPLE } from './samplePeople.js';
import { TEMPLATES, settingsForTemplate } from './index.js';

/** The first sample person's drawn avatar, for anything that needs one photo. */
export const SAMPLE_PHOTO_URL = SAMPLE_PEOPLE[0].personal.photoUrl;

/** Section keys in the default order, all visible. */
const ALL_SECTIONS = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'references',
];

export const SAMPLE_CV = {
  _id: 'sample',
  title: 'Sample CV',
  templateKey: 'classic',
  settings: {
    primaryColor: '#0f172a',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    fontFamily: 'Inter',
    headingFont: '',
    fontSize: 'medium',
    themePreset: 'slate',
    spacing: 'normal',
    sectionOrder: ALL_SECTIONS,
    hiddenSections: [],
  },
  ...SAMPLE_PEOPLE[0],
};

/**
 * The sample person shown in a template: a different person, in a
 * different profession, for every template, so the gallery does not show
 * the same CV forty times. The choice follows the template's place in the
 * registry, so it is the same person every time the gallery opens.
 *
 * @param {string} templateKey - The template being shown.
 * @returns {object} The person's CV fields.
 */
export function samplePersonFor(templateKey) {
  const index = Math.max(
    0,
    TEMPLATES.findIndex((template) => template.key === templateKey),
  );
  return SAMPLE_PEOPLE[index % SAMPLE_PEOPLE.length];
}

/**
 * The sample CV in a given template, in that template's own colours and
 * fonts (its `defaults`), which are what choosing it applies.
 *
 * In the editor the user's other settings — font size, spacing — are kept,
 * so the thumbnail still answers "what would *my* CV look like in this?";
 * on the standalone gallery page the sample's own settings are used.
 *
 * @param {string} templateKey - The template to render.
 * @param {object} [settings] - Styling to apply instead of the sample's.
 * @returns {object} A CV object any template can render.
 */
export function sampleFor(templateKey, settings) {
  const template = TEMPLATES.find((entry) => entry.key === templateKey);
  const base = settingsForTemplate(settings ?? SAMPLE_CV.settings, template);

  return {
    ...SAMPLE_CV,
    ...samplePersonFor(templateKey),
    templateKey,
    // The section order and visibility stay the sample's own: the user may
    // have hidden sections their CV does not have, and hiding them here
    // would make the thumbnails look as empty as their own CV.
    settings: { ...base, sectionOrder: ALL_SECTIONS, hiddenSections: [] },
  };
}

// --- Starting a real CV from the sample -----------------------------------

/** The repeatable sections the sample fills, in the order the form shows them. */
const LIST_SECTIONS = [
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
];

/** Copies entries without the sample's `_id`s, so the server gives them real ones. */
function withoutIds(entries) {
  return entries.map(({ _id, ...entry }) => entry);
}

/**
 * A template's sample content, ready to save into a new CV for the user to
 * type over, so a new CV opens looking finished instead of as a blank page.
 *
 * The name and email are the user's own, from their account; everything
 * else is the sample person shown for that template in the gallery. The
 * drawn avatar is not copied: a real CV should carry the user's own photo
 * or none.
 *
 * @param {string} templateKey - The template the CV starts in.
 * @param {object} [personal] - The new CV's personal details (from the account).
 * @returns {object} A patch for `PUT /api/cvs/:id`.
 */
export function sampleContent(templateKey, personal = {}) {
  const sample = samplePersonFor(templateKey);

  return {
    personal: {
      ...sample.personal,
      fullName: personal.fullName || sample.personal.fullName,
      email: personal.email || sample.personal.email,
      photoUrl: personal.photoUrl || '',
    },
    summary: sample.summary,
    ...Object.fromEntries(LIST_SECTIONS.map((key) => [key, withoutIds(sample[key])])),
    referencesOnRequest: true,
  };
}

/**
 * The sample person whose content a CV still holds untouched, if any.
 *
 * "Untouched" means the summary and every job are exactly the sample's.
 * It is what lets the Design tab swap the sample along with the template
 * while the user is still choosing, and leave their own words alone once
 * they have started typing.
 *
 * @param {object} cv - The CV being edited.
 * @returns {object|null} The matching sample person, or null.
 */
export function untouchedSample(cv) {
  return (
    SAMPLE_PEOPLE.find(
      (person) =>
        cv.summary === person.summary &&
        cv.experience?.length === person.experience.length &&
        cv.experience.every(
          (job, i) =>
            job.company === person.experience[i].company &&
            job.position === person.experience[i].position,
        ),
    ) ?? null
  );
}

/**
 * The content patch for switching an untouched sample CV to another
 * template: the new template's sample person, keeping the user's name,
 * email and photo. Empty when the user has already written their own.
 *
 * @param {object} cv - The CV being edited.
 * @param {string} templateKey - The template being switched to.
 * @returns {object} A patch (possibly empty) for the editor.
 */
export function sampleSwapFor(cv, templateKey) {
  if (!untouchedSample(cv)) return {};
  return sampleContent(templateKey, cv.personal);
}

/** Section labels for the leftover notice. */
const LEFTOVER_LABELS = {
  personal: 'Personal details',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
};

/** Personal fields that come from the sample rather than the account. */
const SAMPLE_PERSONAL_FIELDS = ['headline', 'phone', 'address', 'website', 'linkedin', 'github'];

/**
 * The field each section's entries are recognised by: a sample entry is
 * one whose value here is exactly a sample person's.
 */
const ENTRY_KEYS = {
  experience: 'company',
  education: 'institution',
  skills: 'name',
  projects: 'name',
  certifications: 'name',
  languages: 'language',
};

/** Skills and languages count as sample only while the whole list is. */
const WHOLE_LIST_SECTIONS = new Set(['skills', 'languages']);

/** Every sample value for one section's key field, across all the people. */
function sampleValues(section) {
  const field = ENTRY_KEYS[section];
  return new Set(SAMPLE_PEOPLE.flatMap((person) => person[section].map((entry) => entry[field])));
}

/**
 * Whether one section of a CV still holds sample entries.
 *
 * Skills and languages are only flagged while the whole list is still one
 * sample person's: "English" or "Excel" on their own are things the user
 * may really have.
 *
 * @param {object} cv - The CV being edited.
 * @param {string} section - One of LIST_SECTIONS.
 * @returns {boolean}
 */
function sectionHasSample(cv, section) {
  const field = ENTRY_KEYS[section];
  const entries = cv[section] ?? [];

  if (WHOLE_LIST_SECTIONS.has(section)) {
    return SAMPLE_PEOPLE.some(
      (person) =>
        entries.length > 0 &&
        entries.length === person[section].length &&
        entries.every((entry, i) => entry[field] === person[section][i][field]),
    );
  }

  const values = sampleValues(section);
  return entries.some((entry) => values.has(entry[field]));
}

/**
 * The parts of a CV that still hold sample text, so the editor can say so
 * before anything is downloaded.
 *
 * @param {object} cv - The CV being edited.
 * @returns {Array<{key: string, label: string}>} The sections to mention.
 */
export function sampleLeftovers(cv) {
  const checks = {
    personal: SAMPLE_PEOPLE.some((person) =>
      SAMPLE_PERSONAL_FIELDS.some(
        (field) => cv.personal?.[field] && cv.personal[field] === person.personal[field],
      ),
    ),
    summary: SAMPLE_PEOPLE.some((person) => cv.summary === person.summary),
    ...Object.fromEntries(LIST_SECTIONS.map((section) => [section, sectionHasSample(cv, section)])),
  };

  return Object.keys(LEFTOVER_LABELS)
    .filter((key) => checks[key])
    .map((key) => ({ key, label: LEFTOVER_LABELS[key] }));
}

/**
 * The patch that removes the leftover sample text from a CV and keeps
 * whatever the user has written: within a section only the sample entries
 * go, so a real job added beside the sample one stays.
 *
 * @param {object} cv - The CV being edited.
 * @returns {object} A patch for the editor's change handler.
 */
export function clearSampleContent(cv) {
  const personal = { ...cv.personal };
  for (const field of SAMPLE_PERSONAL_FIELDS) {
    if (SAMPLE_PEOPLE.some((person) => personal[field] === person.personal[field])) {
      personal[field] = '';
    }
  }

  const patch = {
    personal,
    summary: SAMPLE_PEOPLE.some((person) => cv.summary === person.summary) ? '' : cv.summary,
  };

  for (const section of LIST_SECTIONS) {
    if (WHOLE_LIST_SECTIONS.has(section)) {
      patch[section] = sectionHasSample(cv, section) ? [] : cv[section];
    } else {
      const values = sampleValues(section);
      patch[section] = (cv[section] ?? []).filter(
        (entry) => !values.has(entry[ENTRY_KEYS[section]]),
      );
    }
  }

  return patch;
}
