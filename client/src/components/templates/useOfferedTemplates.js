import { useEffect, useState } from 'react';
import { TEMPLATES } from '../../templates/index.js';
import * as templateApi from '../../api/templates.js';

/**
 * The templates a user may choose from: the client's registry, filtered to
 * the ones the admin has left active.
 *
 * The answer is `null` until it arrives, and `null` again if the request
 * fails — and `null` means "offer everything". A network blip must not
 * leave somebody unable to pick a template, and the server decides nothing
 * here: the list only filters what the picker shows.
 *
 * The CV's own template is always included, even if it has since been
 * deactivated. Leaving it out would show no template as current and look
 * as though the CV had lost its template.
 *
 * @param {string} [currentKey] - The template the CV uses now, if any.
 * @returns {{templates: Array<object>, isLoading: boolean}}
 */
export default function useOfferedTemplates(currentKey) {
  const [activeKeys, setActiveKeys] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    templateApi
      .listTemplates()
      .then((data) => {
        if (!cancelled) setActiveKeys(data.templates.map((template) => template.key));
      })
      .catch(() => {
        if (!cancelled) setActiveKeys(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const templates = activeKeys
    ? TEMPLATES.filter(
        (template) => activeKeys.includes(template.key) || template.key === currentKey,
      )
    : TEMPLATES;

  return { templates, isLoading };
}
