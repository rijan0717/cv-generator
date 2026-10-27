import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as talentApi from '../../api/talent.js';
import { INDUSTRIES, EMPLOYMENT_TYPES, labelFor } from '../../constants/industries.js';
import CVPreview from '../../components/cv/CVPreview.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Avatar from '../../components/talent/Avatar.jsx';
import OpenToWorkBadge from '../../components/talent/OpenToWorkBadge.jsx';
import ApprovalNotice from '../../components/company/ApprovalNotice.jsx';

/**
 * One person in full: their photo, what they are looking for, and the CV
 * they have marked as primary.
 *
 * The CV renders through the same `CVPreview` as the builder and the
 * applicants screen, so an employer reading a profile sees the document
 * exactly as its owner designed it.
 */
export default function TalentDetailPage() {
  const { id } = useParams();

  const [person, setPerson] = useState(null);
  const [primaryCv, setPrimaryCv] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessMessage, setAccessMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    talentApi
      .getTalentProfile(id)
      .then((data) => {
        if (cancelled) return;
        setPerson(data.user);
        setPrimaryCv(data.primaryCv);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 403) setAccessMessage(err.message);
        else setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (accessMessage) {
    return (
      <ApprovalNotice
        message={accessMessage}
        detail="Candidate profiles are personal details, so only approved companies can see them."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading the profile" />
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <Alert variant="error">{error || 'That person could not be found'}</Alert>
        <Link to="/talent" className="mt-6 inline-block">
          <Button variant="secondary">Back to the directory</Button>
        </Link>
      </div>
    );
  }

  const { profile } = person;
  const isEmployer = person.accountType === 'employer';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        to="/talent"
        className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        &larr; Directory
      </Link>

      {/* The availability banner sits above everything: whether somebody
          can be approached decides whether the rest is worth reading. */}
      {profile.openToWork && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:ring-emerald-900">
          <OpenToWorkBadge size="lg" />
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            {person.name.split(' ')[0]} is open to new opportunities.
          </p>
        </div>
      )}

      <header className="mt-4 flex flex-wrap items-start gap-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <Avatar name={person.name} src={person.avatarUrl} size="lg" />

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {person.name}
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {isEmployer
              ? (person.company?.name ?? 'No company set up')
              : profile.position || 'No position given'}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            <a href={`mailto:${person.email}`} className="hover:underline">
              {person.email}
            </a>
            {' · joined '}
            {new Date(person.createdAt).toLocaleDateString('en-GB')}
          </p>
        </div>
      </header>

      {/* An employer has no CV, so their page is the company details and
          nothing else — a panel saying "no CV here" would be a hole in
          the layout explaining itself. The details then take the full
          width rather than sitting in a third of it. */}
      <div className={`mt-4 grid gap-4 ${isEmployer ? '' : 'md:grid-cols-3'}`}>
        <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 md:col-span-1">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            {isEmployer ? 'Company' : 'Details'}
          </h2>

          <dl className="mt-3 space-y-3 text-sm">
            {isEmployer ? (
              <>
                <Detail label="Status" value={person.company?.status} />
                <Detail
                  label="Industry"
                  value={person.company?.industry || labelFor(INDUSTRIES, profile.industry)}
                />
                <Detail label="Location" value={person.company?.location} />
              </>
            ) : (
              <>
                <Detail label="Industry" value={labelFor(INDUSTRIES, profile.industry)} />
                <Detail
                  label="Experience"
                  value={`${profile.yearsExperience} year${profile.yearsExperience === 1 ? '' : 's'}`}
                />
                <Detail label="Location" value={profile.location} />
                <Detail
                  label="Looking for"
                  value={profile.employmentTypes
                    .map((type) => labelFor(EMPLOYMENT_TYPES, type))
                    .join(', ')}
                />
                <Detail
                  label="Availability"
                  value={profile.openToWork ? 'Open to work' : 'Not currently looking'}
                />
                <Detail label="CVs on the system" value={String(person.cvCount)} />
              </>
            )}
          </dl>

          {profile.about && (
            <>
              <h3 className="mt-5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                About
              </h3>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">
                {profile.about}
              </p>
            </>
          )}
        </section>

        {!isEmployer && (
          <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 md:col-span-2">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Primary CV</h2>

            {primaryCv ? (
              <>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {primaryCv.title} &middot; updated{' '}
                  {new Date(primaryCv.updatedAt).toLocaleDateString('en-GB')}
                </p>
                <div className="mt-4 max-h-[70vh] overflow-y-auto rounded-xl bg-slate-200/60 p-4 dark:bg-slate-800/60">
                  <CVPreview cv={primaryCv} />
                </div>
              </>
            ) : (
              <p className="mt-3 rounded-lg border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
                This person has not marked any CV as primary yet.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/**
 * One labelled line in the details list, left out entirely when there is
 * nothing to show, so the panel never prints "Location: —".
 *
 * @param {{label: string, value?: string}} props
 */
function Detail({ label, value }) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}
