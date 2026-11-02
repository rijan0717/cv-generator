/**
 * Site search: the part that runs in the browser, and the merge with the
 * part that runs on the server.
 *
 * The site has two kinds of thing to find:
 *
 *   - **Static** — feature pages, templates, FAQ answers and the site's own
 *     pages. They ship with the client, so searching them here is instant
 *     and costs no request.
 *   - **Stored** — blog posts, admin pages, jobs and people. Only the
 *     database has them, so `GET /api/search` finds those.
 *
 * Both end up as the same result shape, `{ group, title, subtitle, to }`,
 * so the dropdown and the results page draw one kind of row.
 */
import { FEATURES } from '../data/features.js';
import { ALL_FAQS } from '../data/faqs.js';
import { TEMPLATES, CATEGORIES } from '../templates/index.js';

/**
 * The result groups, in the order they are shown, with the label of each.
 * `server` marks the groups `GET /api/search` answers.
 */
export const SEARCH_GROUPS = [
  { key: 'pages', label: 'Pages' },
  { key: 'templates', label: 'Templates' },
  { key: 'jobs', label: 'Jobs', server: true },
  { key: 'people', label: 'People', server: true },
  { key: 'blog', label: 'Blog', server: true },
  { key: 'help', label: 'Help' },
];

/** The choices in the scope menu beside the box. */
export const SEARCH_SCOPES = [{ key: 'all', label: 'All' }, ...SEARCH_GROUPS];

/** The shortest query worth searching for. One letter matches nearly everything. */
export const MIN_QUERY = 2;

/**
 * The site's own pages. `auth` pages are only offered to someone signed in,
 * since anyone else would be sent to the login form.
 */
const SITE_PAGES = [
  { title: 'Home', subtitle: 'Start here', to: '/', keywords: 'start' },
  { title: 'Job board', subtitle: 'Every open job', to: '/jobs', keywords: 'vacancies work' },
  { title: 'Blog', subtitle: 'Advice on CVs and applications', to: '/blog', keywords: 'articles' },
  {
    title: 'FAQ',
    subtitle: 'Frequently asked questions',
    to: '/faq',
    keywords: 'help questions support',
  },
  { title: 'Sign up', subtitle: 'Create a free account', to: '/register', guest: true },
  { title: 'Log in', subtitle: 'Sign in to your account', to: '/login', guest: true },
  { title: 'My CVs', subtitle: 'Your saved CVs', to: '/cvs', auth: true, keywords: 'resume' },
  {
    title: 'Template gallery',
    subtitle: 'Choose a design for a new CV',
    to: '/templates',
    auth: true,
  },
  {
    title: 'Tailor to a job',
    subtitle: 'Rewrite your CV for one advert',
    to: '/rewrite',
    auth: true,
    keywords: 'rewrite',
  },
  {
    title: 'Job match',
    subtitle: 'Which jobs fit my CV?',
    to: '/match-cv',
    auth: true,
    keywords: 'score',
  },
  {
    title: 'Interview practice',
    subtitle: 'Questions and mock exams',
    to: '/interview',
    auth: true,
    keywords: 'prep exam',
  },
  { title: 'Applications', subtitle: 'Jobs you have applied for', to: '/applications', auth: true },
  { title: 'Saved jobs', subtitle: 'Jobs you saved for later', to: '/saved-jobs', auth: true },
  { title: 'Profile', subtitle: 'Your name, photo and password', to: '/profile', auth: true },
  { title: 'Settings', subtitle: 'Account settings', to: '/settings', auth: true },
];

/**
 * How well one item matches the query, or 0 for no match.
 *
 * Every word typed must appear somewhere in the item (so "react dev" finds
 * "React Developer" but not "React" alone). Among the matches, an item
 * whose title starts with the query ranks above one that only contains it
 * in the title, which ranks above one matched elsewhere.
 *
 * @param {string} query - Lower-cased, trimmed query.
 * @param {string} title - The item's title.
 * @param {string} rest - Everything else searchable about it.
 * @returns {number} 3, 2, 1 or 0.
 */
export function matchScore(query, title, rest = '') {
  const words = query.split(/\s+/).filter(Boolean);
  const titleText = title.toLowerCase();
  const haystack = `${titleText} ${rest.toLowerCase()}`;

  if (words.length === 0 || !words.every((word) => haystack.includes(word))) return 0;
  if (titleText.startsWith(query)) return 3;
  if (titleText.includes(query)) return 2;
  return 1;
}

/**
 * Keeps the matching items, best first.
 * @param {string} query - Lower-cased, trimmed query.
 * @param {Array<object>} items - Results with a `title` and a `searchText`.
 * @returns {Array<object>} The matches, without `searchText`.
 */
function rank(query, items) {
  return items
    .map((item) => ({ item, score: matchScore(query, item.title, item.searchText) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item: { searchText: _unused, ...result } }) => result);
}

/**
 * Searches the static part of the site.
 *
 * @param {string} rawQuery - What was typed.
 * @param {{isAuthenticated: boolean}} who - Decides which pages are offered
 *   and where a template result leads.
 * @returns {{pages: object[], templates: object[], help: object[]}}
 */
export function searchStatic(rawQuery, { isAuthenticated }) {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < MIN_QUERY) return { pages: [], templates: [], help: [] };

  const sitePages = SITE_PAGES.filter((page) =>
    page.auth ? isAuthenticated : page.guest ? !isAuthenticated : true,
  ).map((page) => ({
    group: 'pages',
    title: page.title,
    subtitle: page.subtitle,
    to: page.to,
    searchText: `${page.subtitle} ${page.keywords ?? ''}`,
  }));

  const featurePages = FEATURES.map((feature) => ({
    group: 'pages',
    title: `${feature.title} ${feature.highlight}`.replace(/,$/, ''),
    subtitle: feature.menu,
    to: `/features/${feature.slug}`,
    searchText: `${feature.eyebrow} ${feature.intro} ${feature.slug.replace(/-/g, ' ')}`,
  }));

  const categoryLabel = (key) => CATEGORIES.find((category) => category.key === key)?.label ?? '';

  const templates = TEMPLATES.map((template) => ({
    group: 'templates',
    title: template.name,
    subtitle: `${categoryLabel(template.category)} template`,
    // The gallery is behind a login; a visitor gets the page describing it.
    to: isAuthenticated ? '/templates' : '/features/templates',
    searchText: `${template.description ?? ''} ${categoryLabel(template.category)} template cv resume`,
  }));

  const help = ALL_FAQS.map((faq) => ({
    group: 'help',
    title: faq.question,
    subtitle: faq.group,
    to: `/faq#${faq.id}`,
    searchText: faq.answer,
  }));

  return {
    pages: rank(query, [...sitePages, ...featurePages]),
    templates: rank(query, templates),
    help: rank(query, help),
  };
}

/**
 * Turns the server's answer into result rows.
 *
 * @param {object} data - The body of `GET /api/search`.
 * @param {{canSeeDirectory: boolean}} who - An approved employer or an admin
 *   is sent to the directory from a person; anyone else to sign-up.
 * @returns {{pages: object[], jobs: object[], people: object[], blog: object[]}}
 */
export function serverResults(data, { canSeeDirectory }) {
  return {
    pages: (data?.pages ?? []).map((page) => ({
      group: 'pages',
      title: page.title,
      subtitle: page.excerpt || 'Page',
      to: `/p/${page.slug}`,
    })),
    jobs: (data?.jobs ?? []).map((job) => ({
      group: 'jobs',
      title: job.title,
      subtitle: [job.company, job.location, job.jobType].filter(Boolean).join(' · '),
      to: `/jobs/${job.id}`,
    })),
    people: (data?.people ?? []).map((person) => ({
      group: 'people',
      title: person.name,
      subtitle: [person.profile?.position, person.profile?.location, 'Open to work']
        .filter(Boolean)
        .join(' · '),
      to: canSeeDirectory ? '/talent' : '/register',
    })),
    blog: (data?.blog ?? []).map((post) => ({
      group: 'blog',
      title: post.title,
      subtitle: post.excerpt || 'Blog post',
      to: `/blog/${post.slug}`,
    })),
  };
}

/**
 * Combines the two halves into one list per group, keeping only the groups
 * the chosen scope covers, each capped at `perGroup`.
 *
 * @param {object} local - From `searchStatic`.
 * @param {object} remote - From `serverResults`.
 * @param {string} scope - A key from SEARCH_SCOPES.
 * @param {number} perGroup - The most rows per group.
 * @returns {Array<{key: string, label: string, results: object[]}>} The
 *   non-empty groups, in display order.
 */
export function mergeResults(local, remote, scope, perGroup) {
  return SEARCH_GROUPS.filter((group) => scope === 'all' || scope === group.key)
    .map((group) => ({
      key: group.key,
      label: group.label,
      results: [...(local[group.key] ?? []), ...(remote[group.key] ?? [])].slice(0, perGroup),
    }))
    .filter((group) => group.results.length > 0);
}
