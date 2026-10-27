import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import * as jobApi from '../../api/jobs.js';
import Spinner from '../../components/ui/Spinner.jsx';
import SummaryTiles from '../../components/ui/SummaryTiles.jsx';
import RecentList from '../../components/ui/RecentList.jsx';
import QuickLinks from '../../components/ui/QuickLinks.jsx';

/** A date as the rest of the application writes it. */
const asDate = (value) => new Date(value).toLocaleDateString('en-GB');

/**
 * The employer's dashboard, and the page they land on after signing in.
 *
 * What an employer wants on arriving is two things: has anybody applied,
 * and are my posts still live. Both are here as numbers and a short
 * list; posting, editing and reading applicants each have their own
 * page.
 *
 * A company waiting for approval still gets this page. It is not
 * blocked — the profile is real and the counts are honest zeros — so
 * instead of the refusal notice it carries a line explaining what
 * approval will unlock. The notice belongs on the pages that genuinely
 * cannot work yet.
 */
export default function CompanyOverviewPage() {
  const { company, counts } = useOutletContext();
  const isApproved = company?.status === 'approved';

  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(isApproved);

  useEffect(() => {
    // Nothing to fetch for a company that cannot post yet.
    if (!isApproved) return undefined;

    let cancelled = false;

    jobApi
      .listMyJobs()
      .then((result) => {
        if (!cancelled) setJobs(result ?? []);
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isApproved]);

  if (isLoading) {
    return (
      <div className="grid min-h-[30vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading your dashboard" />
      </div>
    );
  }

  const openPosts = jobs.filter((job) => job.status === 'open').length;
  const totalApplicants = jobs.reduce((sum, job) => sum + (job.applicationCount ?? 0), 0);

  // The posts worth looking at first are the ones with people waiting.
  const byApplicants = [...jobs]
    .sort((a, b) => (b.applicationCount ?? 0) - (a.applicationCount ?? 0))
    .slice(0, 5);

  return (
    <div>
      <SummaryTiles
        items={[
          {
            label: 'Posts',
            value: jobs.length,
            hint: jobs.length === 0 ? 'nothing posted yet' : `${openPosts} open`,
            to: '/company/posts',
          },
          {
            label: 'Applicants',
            value: totalApplicants || counts.applicationCount || 0,
            hint: totalApplicants === 0 ? 'no one has applied yet' : 'across all your posts',
            to: '/company/posts',
          },
          {
            label: 'Candidates',
            value: 'Browse',
            hint: 'search job seekers by industry',
            to: '/talent',
          },
          {
            label: 'Company profile',
            value: 'Edit',
            hint: 'details, logo and documents',
            to: '/company/profile',
          },
        ]}
      />

      {!isApproved ? (
        <div className="mt-6 rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Waiting for approval</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
            Once an admin approves your company you can post jobs, read applicants and browse
            candidates. Nothing else is needed from you unless they ask for it.
          </p>
          <Link
            to="/company/profile"
            className="mt-3 inline-block text-sm font-medium text-slate-900 underline dark:text-slate-100"
          >
            Check your company details
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
          <RecentList
            title="Your posts"
            items={byApplicants.map((job) => ({
              id: job.id ?? job._id,
              primary: job.title,
              secondary: [job.jobType, job.location, job.status].filter(Boolean).join(' · '),
              meta: `${job.applicationCount ?? 0} applicant${
                (job.applicationCount ?? 0) === 1 ? '' : 's'
              }`,
              to: `/company/posts/${job.id ?? job._id}/applicants`,
            }))}
            emptyMessage="You have not posted any jobs yet."
            emptyAction={{ label: 'Post your first job', to: '/company/posts' }}
            viewAll={{ label: 'All posts', to: '/company/posts' }}
          />

          <QuickLinks
            title="Next steps"
            links={[
              { to: '/company/posts', label: 'Post a job' },
              { to: '/talent', label: 'Find candidates' },
              { to: '/jobs', label: 'See the job board' },
              { to: '/company/profile', label: 'Update your company profile' },
            ]}
          >
            {jobs.length > 0 && totalApplicants === 0 && (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Nobody has applied yet. Browsing candidates and approaching them directly often
                works faster than waiting on a post.
              </p>
            )}

            {company?.updatedAt && (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Company profile last updated {asDate(company.updatedAt)}.
              </p>
            )}
          </QuickLinks>
        </div>
      )}
    </div>
  );
}
