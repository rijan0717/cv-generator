/**
 * The sitemap and robots.txt.
 *
 * These are the two files a crawler asks for before it asks for
 * anything else, and they are the part of SEO that cannot be done in
 * the browser: a search engine fetching `/sitemap.xml` is not running
 * our JavaScript, so the list has to come from the server.
 *
 * Everything listed is public by definition — published pages, published
 * posts, open jobs. Drafts, dashboards and anything behind a login are
 * left out of the sitemap and disallowed in robots.txt.
 */
import { Content } from '../models/Content.js';
import { Job } from '../models/Job.js';
import { env } from '../config/env.js';

/** Pages that always exist, with how often they are worth re-reading. */
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/jobs', changefreq: 'daily', priority: '0.9' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/register', changefreq: 'monthly', priority: '0.5' },
  { path: '/login', changefreq: 'monthly', priority: '0.3' },
];

/**
 * The site's public address.
 *
 * Taken from `CLIENT_URL`, because the sitemap must list the addresses
 * a visitor uses, which during development is the Vite server and in
 * production is wherever the client is deployed — never the API's own
 * host.
 *
 * @returns {string} The origin, without a trailing slash.
 */
function siteUrl() {
  return String(env.clientUrl ?? '').replace(/\/+$/, '');
}

/**
 * Escapes the five characters that are not legal as-is in XML.
 * @param {string} value
 * @returns {string}
 */
function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * One `<url>` entry.
 * @param {{loc: string, lastmod?: Date, changefreq?: string, priority?: string}} entry
 * @returns {string}
 */
function urlNode({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * GET /sitemap.xml
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function getSitemap(_req, res) {
  const base = siteUrl();

  const [content, jobs] = await Promise.all([
    Content.find({ status: 'published', isDeleted: false })
      .select('type slug updatedAt publishedAt')
      .lean(),
    // Only jobs the public board actually shows. An advert from a
    // company awaiting approval is not a page anybody can reach.
    Job.find({ status: 'open', isDeleted: false })
      .select('updatedAt')
      .populate({ path: 'company', select: 'status', match: { status: 'approved' } })
      .lean(),
  ]);

  const urls = [
    ...STATIC_ROUTES.map((route) => ({ loc: `${base}${route.path}`, ...route })),

    ...content.map((item) => ({
      loc: `${base}${item.type === 'post' ? '/blog' : '/p'}/${item.slug}`,
      lastmod: item.updatedAt ?? item.publishedAt,
      changefreq: item.type === 'post' ? 'monthly' : 'yearly',
      priority: item.type === 'post' ? '0.7' : '0.6',
    })),

    ...jobs
      .filter((job) => job.company)
      .map((job) => ({
        loc: `${base}/jobs/${job._id}`,
        lastmod: job.updatedAt,
        changefreq: 'weekly',
        priority: '0.6',
      })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(urlNode),
    '</urlset>',
  ].join('\n');

  res.type('application/xml').send(xml);
}

/**
 * GET /robots.txt
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function getRobots(_req, res) {
  const base = siteUrl();

  // Everything behind a login is disallowed. Not for secrecy — those
  // routes need a session and would give a crawler nothing anyway —
  // but so a crawler spends its time on the pages worth indexing.
  const lines = [
    'User-agent: *',
    'Allow: /$',
    'Allow: /jobs',
    'Allow: /blog',
    'Allow: /p/',
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /cvs',
    'Disallow: /company',
    'Disallow: /talent',
    'Disallow: /applications',
    'Disallow: /saved-jobs',
    'Disallow: /match-cv',
    'Disallow: /rewrite',
    'Disallow: /print',
    'Disallow: /api/',
    '',
    `Sitemap: ${base}/sitemap.xml`,
  ];

  res.type('text/plain').send(lines.join('\n'));
}
