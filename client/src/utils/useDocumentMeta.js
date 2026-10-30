import { useEffect } from 'react';

/** Appended to every page title, so a browser tab says whose site it is. */
const SITE_NAME = 'Smart CV Generator';

/**
 * Finds or creates one meta tag, and sets its content.
 *
 * Tags this hook created are marked, so the cleanup can remove exactly
 * those and leave the ones written into `index.html` alone.
 *
 * @param {string} selector - How to find an existing tag.
 * @param {object} attributes - What to create it with, if it is absent.
 * @param {string} content - The value to set.
 * @returns {HTMLElement}
 */
function setTag(selector, attributes, content) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement(attributes.tag ?? 'meta');
    Object.entries(attributes).forEach(([key, value]) => {
      if (key !== 'tag') element.setAttribute(key, value);
    });
    element.dataset.managed = 'true';
    document.head.appendChild(element);
  }

  if (element.tagName === 'LINK') element.setAttribute('href', content);
  else element.setAttribute('content', content);

  return element;
}

/**
 * Sets the title and the meta tags for the page currently on screen.
 *
 * Written by hand rather than with a helmet library: it is roughly
 * forty lines, it adds no dependency, and the one thing a library
 * would buy us — server-side rendering of these tags — this project
 * does not do anyway.
 *
 * That limitation is worth being honest about. Google renders
 * JavaScript and will see these tags; the scrapers behind Facebook,
 * LinkedIn and WhatsApp previews generally do not. For those, the
 * share card falls back to whatever is in `index.html`. Fixing it
 * properly means rendering the page on the server, which is a larger
 * change than SEO alone justifies here — the sitemap, the canonical
 * links and the structured data all work regardless.
 *
 * @param {{title?: string, description?: string, keywords?: string[],
 *          image?: string, type?: string, canonicalPath?: string,
 *          jsonLd?: object, noIndex?: boolean}} meta
 */
export function useDocumentMeta(meta) {
  const {
    title,
    description,
    keywords,
    image,
    type = 'website',
    canonicalPath,
    jsonLd,
    noIndex = false,
  } = meta ?? {};

  // Serialised, so the effect re-runs when the values change rather
  // than on every render of the page that calls it.
  const key = JSON.stringify([
    title,
    description,
    keywords,
    image,
    type,
    canonicalPath,
    jsonLd,
    noIndex,
  ]);

  useEffect(() => {
    const previousTitle = document.title;

    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    const url = canonicalPath
      ? `${window.location.origin}${canonicalPath}`
      : window.location.href.split('?')[0];

    const absoluteImage = image
      ? image.startsWith('http')
        ? image
        : `${window.location.origin}${image}`
      : '';

    setTag('meta[name="description"]', { name: 'description' }, description ?? '');
    setTag('link[rel="canonical"]', { tag: 'link', rel: 'canonical' }, url);

    if (keywords?.length) {
      setTag('meta[name="keywords"]', { name: 'keywords' }, keywords.join(', '));
    }

    // Open Graph, which LinkedIn, Facebook and WhatsApp read, and
    // Twitter's own set, which it prefers over Open Graph.
    setTag('meta[property="og:title"]', { property: 'og:title' }, title ?? SITE_NAME);
    setTag('meta[property="og:description"]', { property: 'og:description' }, description ?? '');
    setTag('meta[property="og:type"]', { property: 'og:type' }, type);
    setTag('meta[property="og:url"]', { property: 'og:url' }, url);
    setTag('meta[property="og:site_name"]', { property: 'og:site_name' }, SITE_NAME);
    setTag(
      'meta[name="twitter:card"]',
      { name: 'twitter:card' },
      absoluteImage ? 'summary_large_image' : 'summary',
    );
    setTag('meta[name="twitter:title"]', { name: 'twitter:title' }, title ?? SITE_NAME);
    setTag('meta[name="twitter:description"]', { name: 'twitter:description' }, description ?? '');

    if (absoluteImage) {
      setTag('meta[property="og:image"]', { property: 'og:image' }, absoluteImage);
      setTag('meta[name="twitter:image"]', { name: 'twitter:image' }, absoluteImage);
    }

    // Pages behind a login, and anything duplicated, ask not to be
    // indexed rather than relying on robots.txt alone.
    if (noIndex) {
      setTag('meta[name="robots"]', { name: 'robots' }, 'noindex, nofollow');
    } else {
      document.head.querySelector('meta[name="robots"][data-managed]')?.remove();
    }

    // Structured data: what tells a search engine this page is an
    // article with an author and a date, rather than just text.
    let script = null;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.managed = 'true';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.title = previousTitle;
      script?.remove();
    };
    // `key` carries every input; listing them again would only let the
    // two drift apart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export default useDocumentMeta;
