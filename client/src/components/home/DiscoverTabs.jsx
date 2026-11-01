import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Stagger } from '../ui/motion.jsx';
import { fadeInUp, hoverLift } from '../ui/motionVariants.js';
import TemplateThumbnail from '../templates/TemplateThumbnail.jsx';
import useOfferedTemplates from '../templates/useOfferedTemplates.js';
import { sampleFor } from '../../templates/sampleCV.js';
import { engagementFor, formatCount } from '../../utils/engagement.js';
import * as jobApi from '../../api/jobs.js';
import * as talentApi from '../../api/talent.js';
import { useAuth } from '../../context/useAuth.js';
import Spinner from '../ui/Spinner.jsx';

/**
 * The browsing block under the hero: four tabs over one search box.
 *
 * It exists because the home page's job is to answer "what is in here?",
 * and a list of feature paragraphs answers that far more slowly than
 * showing the things themselves. The tabs are the four kinds of thing the
 * site holds:
 *
 *   - **Templates** — the designs, drawn as real templates rather than as
 *     screenshots, so the gallery cannot drift from what the builder makes.
 *   - **Jobs** — what is actually on the board right now, loaded from the
 *     public endpoint so an empty board shows as empty rather than as a
 *     claim.
 *   - **People** — the candidate directory. The odd one out: it is the
 *     only tab whose contents are not public, so it shows real candidates
 *     to an approved employer and an explanation to everybody else. See
 *     `PeopleLocked`.
 *   - **Services** — the tools, which are the part a visitor cannot see by
 *     looking and therefore the part that has to be described.
 *
 * The search box filters whichever tab is open, in the browser. It is not
 * sent to the server: the template list is already here in full, and the
 * board is a page of eight. Following through to the full page is what the
 * link under each grid is for.
 */

/** How many cards each tab shows before sending the reader to the full page. */
const GRID_LIMIT = 8;

/** The three tabs, with the icon drawn beside each label. */
const TABS = [
  { key: 'templates', label: 'Templates', icon: 'M4 4h7v16H4z M13 4h7v7h-7z M13 13h7v7h-7z' },
  { key: 'jobs', label: 'Jobs', icon: 'M3 7h18v13H3z M8 7V4h8v3' },
  {
    key: 'people',
    label: 'People',
    icon: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 20a7 7 0 0 1 14 0 M17 11a3 3 0 1 0 0-6 M18 20a6 6 0 0 0-1-3',
  },
  {
    key: 'services',
    label: 'Services',
    icon: 'M5 3h9l5 5v13H5z M14 3v5h5 M9 12h6 M9 16h4',
  },
];

/** The chips under the search box, per tab. Clicking one searches for it. */
const POPULAR = {
  templates: ['ATS-friendly', 'Modern', 'Creative', 'Two column', 'With photo', 'Simple'],
  jobs: ['Remote', 'Full-time', 'Internship', 'Kathmandu', 'Developer', 'Marketing'],
  people: ['Open to work', 'Technology', 'Finance', 'Design', 'Full-time', 'Kathmandu'],
  services: ['AI score', 'AI rewrite', 'Interview prep', 'Job match'],
};

/** Where the link under each grid goes, and what it says. */
const FULL_PAGE = {
  templates: { to: '/templates', label: 'See all 40 templates' },
  jobs: { to: '/jobs', label: 'See every job' },
  people: { to: '/talent', label: 'Open the full directory' },
  services: { to: '/register', label: 'Start using these — free' },
};

/** What the search box says, per tab. */
const PLACEHOLDER = {
  templates: 'What kind of CV template are you looking for?',
  jobs: 'What job are you looking for?',
  people: 'What kind of candidate are you looking for?',
  services: 'What would you like help with?',
};

/**
 * The tools, as cards.
 *
 * Written here rather than fetched because they are the application's own
 * features, not data: a service appearing or disappearing is a release,
 * not a row.
 */
const SERVICES = [
  {
    to: '/match-cv',
    name: 'AI CV score',
    tagline: 'Is my CV good enough?',
    description:
      'Scores your CV out of 100 against forty checks — completeness, action verbs, quantified achievements, date consistency — and lists what to fix first.',
    tags: ['Scoring', 'Free'],
  },
  {
    to: '/rewrite',
    name: 'AI rewrite',
    tagline: 'Rewrite it for one job',
    description:
      'Paste a job advert and your CV is rewritten to use its language, keeping every fact and changing only how it is said. You review each change before it is kept.',
    tags: ['Rewrite', 'Per job'],
  },
  {
    to: '/interview',
    name: 'Interview prep',
    tagline: 'Practise before the day',
    description:
      'Study questions and timed mock exams for 700 job titles, each answer explained so you learn the reasoning rather than the answer.',
    tags: ['700 roles', 'Timed exams'],
  },
  {
    to: '/jobs',
    name: 'Job match',
    tagline: 'Which jobs fit me?',
    description:
      'Every advert on the board scored against your CV with TF-IDF and cosine similarity, showing the keywords you match and the ones you are missing.',
    tags: ['Matching', 'Keyword gaps'],
  },
];

/** The heart and eye counts on a template card. */
function Stat({ path, label, value }) {
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={path} />
      </svg>
      <span>{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** One template, as a card with its sample figures underneath. */
function TemplateCard({ template }) {
  const { likes, views } = engagementFor(template.key);
  const cv = useMemo(() => sampleFor(template.key), [template.key]);

  return (
    <motion.a
      // An anchor rather than a router `Link` so framer-motion can drive
      // the element directly; the gallery is a normal navigation, so a
      // plain href behaves identically.
      href="/templates"
      variants={fadeInUp}
      {...hoverLift}
      className="group block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-fuchsia"
    >
      {/* The glow is a sibling behind the card rather than a shadow on it,
          so it can spill past the rounded corner and read as an aura
          rather than as a drop shadow.

          `isolate` is load-bearing: it makes this wrapper a stacking
          context, which keeps the `-z-10` glow behind the card instead of
          behind the whole section. */}
      <div className="relative isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 -z-10 rounded-[1.25rem] cvg-gradient-bg opacity-0 blur transition-opacity duration-300 group-hover:opacity-60"
        />

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-slate-900/10 dark:border-navy-700 dark:bg-navy-800">
          <TemplateThumbnail cv={cv} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 px-1">
        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
          {template.name}
        </span>

        <span className="flex shrink-0 items-center gap-3 text-xs text-slate-500 dark:text-slate-100">
          <Stat
            label="likes"
            value={formatCount(likes)}
            path="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"
          />
          <Stat
            label="views"
            value={formatCount(views)}
            path="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
          />
        </span>
      </div>
    </motion.a>
  );
}

/** One advert, as a card. */
function JobCard({ job }) {
  return (
    <motion.a
      href={`/jobs/${job.id ?? job._id}`}
      variants={fadeInUp}
      {...hoverLift}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-[border-color,box-shadow] duration-300 hover:border-brand-violet hover:shadow-xl hover:shadow-brand-violet/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia dark:border-navy-700 dark:bg-navy-800"
    >
      <div className="flex items-center gap-3">
        {job.company?.logoUrl ? (
          <img
            src={job.company.logoUrl}
            alt=""
            className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-navy-700"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl cvg-gradient-bg text-sm font-bold text-white"
          >
            {(job.company?.name ?? '?').slice(0, 1).toUpperCase()}
          </span>
        )}

        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {job.title}
          </span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-100">
            {job.company?.name ?? 'A company on SmartCV'}
          </span>
        </span>
      </div>

      {/* The skills, not the description: `GET /api/jobs` returns a
          summary of each post and leaves the body out, so a paragraph
          here would be a permanently empty one. The skills are the part
          a reader is scanning for anyway. */}
      <p className="mt-4 line-clamp-3 flex-1 text-sm text-slate-600 dark:text-slate-100">
        {job.skills?.length > 0 ? job.skills.join(' · ') : null}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {/* Deduplicated: a remote post in no particular place has the same
            word for its work mode and its location, and the card should
            not say "Remote Remote". */}
        {[...new Set([job.jobType, job.workMode, job.location].filter(Boolean))].map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.a>
  );
}

/**
 * One candidate, as a card.
 *
 * Shown only to an approved employer — see `PeopleLocked` below for why.
 */
function PersonCard({ person }) {
  const profile = person.profile ?? {};

  return (
    <motion.a
      href={`/talent/${person.id}`}
      variants={fadeInUp}
      {...hoverLift}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-[border-color,box-shadow] duration-300 hover:border-brand-violet hover:shadow-xl hover:shadow-brand-violet/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia dark:border-navy-700 dark:bg-navy-800"
    >
      <div className="flex items-center gap-3">
        {person.avatarUrl ? (
          <img src={person.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="cvg-gradient-bg grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white"
          >
            {person.name.charAt(0).toUpperCase()}
          </span>
        )}

        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
            {person.name}
          </span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-100">
            {profile.position || 'No position given'}
          </span>
        </span>
      </div>

      {profile.openToWork && (
        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-fuchsia-100 px-2.5 py-1 text-xs font-semibold text-brand-violet dark:bg-fuchsia-200 dark:text-fuchsia-100">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand-violet" />
          Open to work
        </span>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {[
          profile.industry,
          profile.yearsExperience
            ? `${profile.yearsExperience} year${profile.yearsExperience === 1 ? '' : 's'}`
            : null,
          profile.location,
          ...(profile.employmentTypes ?? []),
        ]
          .filter(Boolean)
          .slice(0, 4)
          .map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-navy-900 dark:text-slate-100"
            >
              {tag}
            </span>
          ))}
      </div>
    </motion.a>
  );
}

/**
 * What the People tab shows to everybody else.
 *
 * The candidate directory is closed: `/api/talent` is behind
 * `requireAuth` and `requireApprovedEmployer`, so a visitor cannot be
 * shown real people here, and should not be — job seekers put their CV
 * on this site to be found by employers, not to be listed on a public
 * home page.
 *
 * So the tab is still offered, because it is part of what the site does
 * and hiding it would not explain itself, and it describes the directory
 * instead of previewing it. `reason` carries the server's own message
 * when the request was refused — "your company is awaiting approval" is
 * more useful than anything written here.
 */
function PeopleLocked({ reason }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-navy-700">
      <span
        aria-hidden="true"
        className="cvg-gradient-bg mx-auto grid h-12 w-12 place-items-center rounded-2xl text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* A padlock: the body, then the shackle over it. */}
          <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
          <path d="M8.5 10.5V7a3.5 3.5 0 0 1 7 0v3.5" />
        </svg>
      </span>

      <h3 className="mt-5 font-display text-xl font-bold text-slate-900 dark:text-slate-50">
        The candidate directory is for employers
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-100">
        {reason ||
          'Job seekers here have said they are open to work and chosen a CV to show. The directory is open to approved companies only — it is not a public list of people.'}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <Link
          to="/register"
          className="cvg-gradient-bg cvg-glow cvg-glow-hover rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-95"
        >
          Create an employer account
        </Link>
        <Link
          to="/features/find-candidates"
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-100 dark:hover:text-white"
        >
          How the directory works
        </Link>
      </div>
    </div>
  );
}

/** One tool, as a card. */
function ServiceCard({ service }) {
  return (
    <motion.a
      href={service.to}
      variants={fadeInUp}
      {...hoverLift}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-[border-color,box-shadow] duration-300 hover:border-brand-violet hover:shadow-xl hover:shadow-brand-violet/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia dark:border-navy-700 dark:bg-navy-800"
    >
      <span
        aria-hidden="true"
        className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-violet to-brand-pink"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#fff" aria-hidden="true">
          <path d="M12 2.5l1.9 4.6 4.6 1.9-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.9L12 2.5ZM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
        </svg>
      </span>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-fuchsia dark:text-fuchsia-100">
        {service.tagline}
      </p>
      <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-50">
        {service.name}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-100">
        {service.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {service.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.a>
  );
}

/** Says there is nothing to show, and offers a way out of the filter. */
function Empty({ message, onClear }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-slate-300 py-14 text-center dark:border-navy-700">
      <p className="text-sm text-slate-600 dark:text-slate-100">{message}</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 text-sm font-semibold text-brand-fuchsia hover:underline dark:text-fuchsia-100"
        >
          Clear the search
        </button>
      )}
    </div>
  );
}

export default function DiscoverTabs() {
  const [tab, setTab] = useState('templates');
  const [query, setQuery] = useState('');

  const { templates } = useOfferedTemplates();

  const [jobs, setJobs] = useState(null);
  const [jobsFailed, setJobsFailed] = useState(false);

  // The board is only fetched once the Jobs tab is actually opened. Most
  // visitors never open it, and the home page should not pay for a request
  // nobody asked for.
  useEffect(() => {
    if (tab !== 'jobs' || jobs !== null) return undefined;

    let cancelled = false;

    jobApi
      .listJobs({ limit: 24 })
      .then((data) => {
        if (!cancelled) setJobs(data.jobs);
      })
      .catch(() => {
        if (!cancelled) {
          setJobs([]);
          setJobsFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tab, jobs]);

  const { user, isAuthenticated } = useAuth();

  const [people, setPeople] = useState(null);
  const [peopleReason, setPeopleReason] = useState('');

  // Only an admin or an employer has any chance of reading the directory,
  // and only the server knows whether that employer's company has been
  // approved. So the request is attempted for those two and the refusal
  // is shown as the server words it; for everybody else there is no
  // request to make.
  //
  // Worth knowing: today nobody signed in reaches this component, because
  // `HomeRoute` sends an authenticated user from `/` to their own
  // dashboard. So in practice this tab always shows `PeopleLocked`. The
  // branch is kept rather than removed because the gate belongs with the
  // data — if the redirect changes, or this block is reused on a page a
  // signed-in employer can reach, the right thing happens without anyone
  // having to remember to add it back.
  const maySeePeople =
    isAuthenticated && (user?.role === 'admin' || user?.accountType === 'employer');

  useEffect(() => {
    if (tab !== 'people' || people !== null) return undefined;

    if (!maySeePeople) {
      setPeople([]);
      setPeopleReason('');
      return undefined;
    }

    let cancelled = false;

    talentApi
      .listTalent({ page: 1 })
      .then((data) => {
        if (!cancelled) setPeople(data.users);
      })
      .catch((error) => {
        if (!cancelled) {
          setPeople([]);
          setPeopleReason(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tab, people, maySeePeople]);

  // Switching tab clears the search: "ATS-friendly" means nothing on the
  // jobs tab, and leaving it there would show an empty grid for no visible
  // reason.
  function changeTab(next) {
    setTab(next);
    setQuery('');
  }

  const needle = query.trim().toLowerCase();

  /** Whether any of the given strings contains what was typed. */
  const matches = (...fields) =>
    needle === '' || fields.filter(Boolean).join(' ').toLowerCase().includes(needle);

  const shownTemplates = templates
    .filter((template) =>
      matches(
        template.name,
        template.description,
        template.category,
        template.isTwoColumn ? 'two column' : '',
        template.usesPhoto ? 'with photo' : '',
        template.category === 'ats' ? 'ats-friendly' : '',
      ),
    )
    .slice(0, GRID_LIMIT);

  const shownJobs = (jobs ?? [])
    .filter((job) =>
      matches(
        job.title,
        job.company?.name,
        job.location,
        job.jobType,
        job.workMode,
        job.skills?.join(' '),
      ),
    )
    .slice(0, GRID_LIMIT);

  const shownServices = SERVICES.filter((service) =>
    matches(service.name, service.tagline, service.description, service.tags.join(' ')),
  );

  const shownPeople = (people ?? [])
    .filter((person) =>
      matches(
        person.name,
        person.profile?.position,
        person.profile?.industry,
        person.profile?.location,
        person.profile?.openToWork ? 'open to work' : '',
        person.profile?.employmentTypes?.join(' '),
      ),
    )
    .slice(0, GRID_LIMIT);

  return (
    <section
      aria-labelledby="discover-heading"
      className="border-t border-slate-200 bg-white py-14 sm:py-20 dark:border-navy-700 dark:bg-navy-900"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="discover-heading" className="sr-only">
          Browse templates, jobs and services
        </h2>

        {/* --- Tabs --- */}
        <div role="tablist" aria-label="What to browse" className="flex flex-wrap gap-1">
          {TABS.map((item) => {
            const isActive = item.key === tab;

            return (
              <button
                key={item.key}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => changeTab(item.key)}
                className={[
                  'relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia',
                  isActive
                    ? 'text-slate-900 dark:text-slate-50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white',
                ].join(' ')}
              >
                {/* The selected background is one element that moves
                    between the tabs rather than three that fade in and
                    out, so the eye follows it across instead of losing it
                    and finding it again.

                    Painted first and the content given `relative`, rather
                    than pushed back with a negative z-index: the button is
                    `relative` with an automatic z-index and so is not a
                    stacking context, and `-z-10` would send this behind
                    the section's own background instead of behind the
                    label. */}
                {isActive && (
                  <motion.span
                    layoutId="discover-tab"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-xl bg-slate-100 dark:bg-navy-800"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <svg
                  className="relative h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={item.icon} />
                </svg>
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* --- Search --- */}
        <form
          role="search"
          onSubmit={(event) => event.preventDefault()}
          className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-100 p-2 pl-5 dark:bg-navy-800"
        >
          <label htmlFor="discover-search" className="sr-only">
            {PLACEHOLDER[tab]}
          </label>
          <input
            id="discover-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={PLACEHOLDER[tab]}
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 sm:text-base dark:text-slate-50 dark:placeholder:text-slate-400"
          />
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full cvg-gradient-bg text-white"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
        </form>

        {/* --- Popular chips --- */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">Popular:</span>
          {/* The chips are keyed by tab as well as by label, so switching
              tab replaces the row rather than morphing one set of words
              into another. */}
          <AnimatePresence mode="popLayout" initial={false}>
            {POPULAR[tab].map((chip, index) => (
              <motion.button
                key={`${tab}:${chip}`}
                type="button"
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18, delay: index * 0.03 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setQuery(query === chip ? '' : chip)}
                aria-pressed={query === chip}
                className={[
                  'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-fuchsia',
                  query === chip
                    ? 'cvg-gradient-bg border-transparent text-white'
                    : 'border-slate-300 text-slate-700 hover:border-brand-violet hover:text-brand-violet dark:border-slate-600 dark:text-slate-100 dark:hover:border-brand-violet',
                ].join(' ')}
              >
                {chip}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* --- The grid for whichever tab is open --- */}
        <Stagger
          key={tab}
          className="mt-8 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4"
        >
          {tab === 'templates' &&
            (shownTemplates.length > 0 ? (
              shownTemplates.map((template) => (
                <TemplateCard key={template.key} template={template} />
              ))
            ) : (
              <Empty
                message="No template matches that."
                onClear={needle ? () => setQuery('') : undefined}
              />
            ))}

          {tab === 'jobs' &&
            (jobs === null ? (
              <div className="col-span-full grid place-items-center py-14">
                <Spinner label="Loading jobs" />
              </div>
            ) : shownJobs.length > 0 ? (
              shownJobs.map((job) => <JobCard key={job.id ?? job._id} job={job} />)
            ) : (
              <Empty
                message={
                  jobsFailed
                    ? 'The job board could not be loaded just now.'
                    : needle
                      ? 'No job on the board matches that.'
                      : 'There are no jobs on the board yet.'
                }
                onClear={needle ? () => setQuery('') : undefined}
              />
            ))}

          {tab === 'people' &&
            (people === null ? (
              <div className="col-span-full grid place-items-center py-14">
                <Spinner label="Loading candidates" />
              </div>
            ) : !maySeePeople || peopleReason ? (
              <PeopleLocked reason={peopleReason} />
            ) : shownPeople.length > 0 ? (
              shownPeople.map((person) => <PersonCard key={person.id} person={person} />)
            ) : (
              <Empty
                message={
                  needle
                    ? 'Nobody in the directory matches that.'
                    : 'Nobody has joined the directory yet.'
                }
                onClear={needle ? () => setQuery('') : undefined}
              />
            ))}

          {tab === 'services' &&
            (shownServices.length > 0 ? (
              shownServices.map((service) => <ServiceCard key={service.to} service={service} />)
            ) : (
              <Empty
                message="No service matches that."
                onClear={needle ? () => setQuery('') : undefined}
              />
            ))}
        </Stagger>

        {/* The figures on the template cards are made up, and saying so is
            cheaper than being asked. */}
        {tab === 'templates' && (
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-100">
            Like and view counts are sample figures.
          </p>
        )}

        {/* The link under the grid, per tab. It is left out of the People
            tab when the directory is closed to this reader: that panel
            carries its own two calls to action, and a third underneath
            pointing at a page they cannot open would only be noise. */}
        {!(tab === 'people' && (!maySeePeople || peopleReason)) && (
          <div className="mt-8 text-center">
            <Link
              to={FULL_PAGE[tab].to}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-900 dark:border-slate-600 dark:text-slate-50 dark:hover:border-slate-300"
            >
              {FULL_PAGE[tab].label}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
