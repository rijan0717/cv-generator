/** The cards the discover tabs lay out: a template, a job, a service. */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, hoverLift } from '../../ui/motionVariants.js';
import TemplateThumbnail from '../../templates/TemplateThumbnail.jsx';
import { sampleFor } from '../../../templates/sampleCV.js';
import { engagementFor, formatCount } from '../../../utils/engagement.js';

/** The heart and eye counts on a template card. */
export function Stat({ path, label, value }) {
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
export function TemplateCard({ template }) {
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
export function JobCard({ job }) {
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

/** One tool, as a card. */
export function ServiceCard({ service }) {
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

      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-fuchsia dark:text-fuchsia-400">
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
