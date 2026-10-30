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
