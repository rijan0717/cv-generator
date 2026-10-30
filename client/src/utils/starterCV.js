import * as cvApi from '../api/cvs.js';
import { getTemplate, settingsForTemplate } from '../templates/index.js';
import { sampleContent } from '../templates/sampleCV.js';

/**
 * Creates a new CV that starts out looking finished: the chosen template,
 * in its own colours and fonts, filled with that template's sample content
 * for the user to type over one field at a time.
 *
 * Two requests rather than one: `POST /api/cvs` makes the CV (and fills in
 * the name and email from the account), and `PUT` adds the sample through
 * the same path every later save takes, so the content is validated and
 * the strength score is worked out exactly as for anything the user types.
 *
 * @param {{title: string, templateKey?: string}} options
 * @returns {Promise<object>} The saved CV.
 */
export async function createStarterCV({ title, templateKey = 'classic' }) {
  const created = await cvApi.createCV({ title, templateKey });
  const template = getTemplate(templateKey);

  return cvApi.updateCV(created._id, {
    ...sampleContent(templateKey, created.personal),
    settings: settingsForTemplate(created.settings ?? {}, template),
  });
}
