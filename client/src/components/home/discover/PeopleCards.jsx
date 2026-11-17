/** The candidate cards, and what stands in for them when the viewer may not see people. */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fadeInUp, hoverLift } from '../../ui/motionVariants.js';

/**
 * One candidate, as a card.
 *
 * An approved employer gets the full card. Everybody else gets the public
 * preview: the same card, but the server has shortened the name, left out
 * the photo and the id, and only sent people who are open to work.
 */
export function PersonCard({ person }) {
  const profile = person.profile ?? {};

  return (
    <motion.a
      // A preview card has no id (see `listTalentPreview` on the server), so
      // it leads to sign-up rather than to a profile the visitor cannot open.
      href={person.id ? `/talent/${person.id}` : '/register'}
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
        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-fuchsia-100 px-2.5 py-1 text-xs font-semibold text-brand-violet dark:bg-fuchsia-500/15 dark:text-fuchsia-400">
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
export function PeopleLocked({ reason }) {
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
          className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-100 dark:hover:text-slate-50"
        >
          How the directory works
        </Link>
      </div>
    </div>
  );
}
