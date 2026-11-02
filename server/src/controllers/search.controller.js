/**
 * Site search controller.
 *
 * Backs the search box in the header. The client already holds the static
 * parts of the site (feature pages, templates, the FAQ) and searches those
 * itself; this endpoint covers what only the database knows:
 *
 *   - **blog** — published blog posts;
 *   - **pages** — published pages the admin has written;
 *   - **jobs** — open jobs from approved companies;
 *   - **people** — job seekers who are open to work, as the same trimmed
 *     public card the home page shows (no id, no contact details).
 *
 * Everything here is public: it returns nothing a visitor could not
 * already reach by browsing.
 */
import { Content } from '../models/Content.js';
import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { visibleJobsFilter } from '../services/companyVisibility.js';
import { toPreviewPerson, PUBLIC_PEOPLE_FILTER } from './talent.controller.js';
import { sendSuccess } from '../utils/apiResponse.js';

/** The groups a search can be narrowed to. */
export const SEARCH_TYPES = ['all', 'blog', 'pages', 'jobs', 'people'];

/** At most this many results per group: a dropdown, not a results page. */
const PER_GROUP = 5;

/**
 * Escapes a search term before it becomes a regular expression, so a
 * search for ".*" is matched literally rather than matching everything.
 * @param {string} value - The raw term.
 * @returns {string} The escaped term.
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Published content of one type whose title, summary or keywords match.
 * @param {'post'|'page'} type - Blog post or page.
 * @param {RegExp} pattern - The search pattern.
 * @returns {Promise<Array<{title: string, slug: string, excerpt: string}>>}
 */
async function searchContent(type, pattern) {
  const docs = await Content.find({
    type,
    status: 'published',
    isDeleted: false,
    $or: [{ title: pattern }, { excerpt: pattern }, { 'seo.keywords': pattern }],
  })
    .select('title slug excerpt')
    .sort({ publishedAt: -1 })
    .limit(PER_GROUP)
    .lean();

  return docs.map((doc) => ({ title: doc.title, slug: doc.slug, excerpt: doc.excerpt ?? '' }));
}

/**
 * Open jobs from approved companies whose title, skills or location match.
 * @param {RegExp} pattern - The search pattern.
 * @returns {Promise<Array<object>>}
 */
async function searchJobs(pattern) {
  const filter = await visibleJobsFilter({
    isDeleted: false,
    status: 'open',
    $or: [{ title: pattern }, { skills: pattern }, { location: pattern }],
  });

  const jobs = await Job.find(filter)
    .select('title location jobType company')
    .populate('company', 'name')
    .sort({ createdAt: -1 })
    .limit(PER_GROUP)
    .lean();

  return jobs.map((job) => ({
    id: job._id.toString(),
    title: job.title,
    company: job.company?.name ?? '',
    location: job.location ?? '',
    jobType: job.jobType ?? '',
  }));
}

/**
 * Open-to-work job seekers whose name or position matches, as public cards.
 * @param {RegExp} pattern - The search pattern.
 * @returns {Promise<Array<object>>}
 */
async function searchPeople(pattern) {
  const users = await User.find({
    ...PUBLIC_PEOPLE_FILTER,
    $or: [{ name: pattern }, { 'jobSeekerProfile.position': pattern }],
  })
    .select('name jobSeekerProfile')
    .sort({ updatedAt: -1 })
    .limit(PER_GROUP)
    .lean();

  return users.map(toPreviewPerson);
}

/**
 * GET /api/search?q=&type=
 *
 * Searches the groups asked for (all four by default) in parallel and
 * returns each as its own list, so the client can show them under
 * headings. A group that was not asked for comes back empty.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function search(req, res) {
  const term = req.query.q.trim();
  const type = req.query.type ?? 'all';
  const pattern = new RegExp(escapeRegex(term), 'i');
  const wants = (group) => type === 'all' || type === group;

  const [blog, pages, jobs, people] = await Promise.all([
    wants('blog') ? searchContent('post', pattern) : [],
    wants('pages') ? searchContent('page', pattern) : [],
    wants('jobs') ? searchJobs(pattern) : [],
    wants('people') ? searchPeople(pattern) : [],
  ]);

  sendSuccess(res, { query: term, blog, pages, jobs, people }, 'Search results');
}
