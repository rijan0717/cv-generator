import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as companyApi from '../../api/companies.js';
import * as jobApi from '../../api/jobs.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];

/**
 * The employer side: set up a company, then post and manage jobs.
 *
 * Creating a company is what lets a user post. There is no separate role
 * and no approval step, so this page is reachable by anyone — it simply
 * shows the set-up form first.
 */
export default function CompanyPage() {
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await companyApi.getMyCompany();
        if (cancelled) return;

        setCompany(data.company);

        if (data.company) {
          const myJobs = await jobApi.listMyJobs();
          if (!cancelled) setJobs(myJobs);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-slate-500 dark:text-slate-400">
        <Spinner label="Loading your company" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {company ? company.name : 'Set up your company'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {company
            ? 'Post jobs and review the people who apply.'
            : 'Create a company profile, then you can post jobs for others to apply to.'}
        </p>
      </header>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      {!company ? (
        <CompanyForm onSaved={setCompany} />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Your postings <span className="text-slate-500">({jobs.length})</span>
            </h2>
            <Button size="sm" onClick={() => setIsPosting((open) => !open)}>
              {isPosting ? 'Cancel' : 'Post a job'}
            </Button>
          </div>

          {isPosting && (
            <div className="mt-4">
              <JobForm
                onPosted={(job) => {
                  setJobs((current) => [job, ...current]);
                  setIsPosting(false);
                }}
              />
            </div>
          )}

          {jobs.length === 0 ? (
            <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-900">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You have not posted any jobs yet.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {jobs.map((job) => (
                <li
                  key={job._id}
                  className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/jobs/${job._id}`}
                      className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {job.jobType}
                      {job.location && <> &middot; {job.location}</>} &middot; posted{' '}
                      {new Date(job.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </div>

                  <span
                    className={
                      job.status === 'open'
                        ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }
                  >
                    {job.status}
                  </span>

                  <Link to={`/company/jobs/${job._id}/applicants`}>
                    <Button size="sm" variant="secondary">
                      {job.applicationCount} applicant{job.applicationCount === 1 ? '' : 's'}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Company details</h2>
            <CompanyForm company={company} onSaved={setCompany} />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Create or edit the company profile.
 * @param {{company?: object, onSaved: (company: object) => void}} props
 */
function CompanyForm({ company, onSaved }) {
  const [form, setForm] = useState({
    name: company?.name ?? '',
    description: company?.description ?? '',
    website: company?.website ?? '',
    location: company?.location ?? '',
    industry: company?.industry ?? '',
  });
  const [status, setStatus] = useState({ error: '', success: '' });
  const [isSaving, setIsSaving] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ error: '', success: '' });

    if (form.name.trim().length < 2) {
      setStatus({ error: 'Company name must be at least 2 characters', success: '' });
      return;
    }

    setIsSaving(true);
    try {
      const saved = company
        ? await companyApi.updateMyCompany(form)
        : await companyApi.createCompany(form);

      onSaved(saved);
      setStatus({ error: '', success: 'Saved' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
    >
      <Alert variant="error">{status.error}</Alert>
      <Alert variant="success">{status.success}</Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Company name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
        />
        <TextField
          label="Industry"
          value={form.industry}
          onChange={(e) => update('industry', e.target.value)}
        />
        <TextField
          label="Location"
          value={form.location}
          onChange={(e) => update('location', e.target.value)}
        />
        <TextField
          label="Website"
          value={form.website}
          onChange={(e) => update('website', e.target.value)}
        />
      </div>

      <div>
        <label
          htmlFor="company-description"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          About the company
        </label>
        <textarea
          id="company-description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={4}
          maxLength={2000}
          className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
        />
      </div>

      <Button type="submit" isLoading={isSaving}>
        {company ? 'Save changes' : 'Create company'}
      </Button>
    </form>
  );
}

/**
 * The form for posting a new job.
 * @param {{onPosted: (job: object) => void}} props
 */
function JobForm({ onPosted }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    jobType: 'Full-time',
    workMode: 'On-site',
    salaryRange: '',
    skills: '',
    closingDate: '',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.title.trim().length < 3) {
      setError('Give the job a title of at least 3 characters');
      return;
    }
    if (form.description.trim().length < 20) {
      setError('Describe the job in at least 20 characters');
      return;
    }

    setIsSaving(true);
    try {
      const job = await jobApi.createJob({
        ...form,
        skills: form.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        closingDate: form.closingDate || null,
      });
      onPosted(job);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
    >
      <Alert variant="error">{error}</Alert>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Job title"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          className="sm:col-span-2"
          required
        />
        <TextField
          label="Location"
          value={form.location}
          onChange={(e) => update('location', e.target.value)}
        />
        <TextField
          label="Salary range"
          value={form.salaryRange}
          onChange={(e) => update('salaryRange', e.target.value)}
          hint="Free text, e.g. NPR 60,000 to 90,000"
        />

        <div>
          <label
            htmlFor="new-job-type"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Type
          </label>
          <select
            id="new-job-type"
            value={form.jobType}
            onChange={(e) => update('jobType', e.target.value)}
            className="mt-1 block w-full rounded-lg border-0 py-2 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          >
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="new-work-mode"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Work mode
          </label>
          <select
            id="new-work-mode"
            value={form.workMode}
            onChange={(e) => update('workMode', e.target.value)}
            className="mt-1 block w-full rounded-lg border-0 py-2 pl-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          >
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        <TextField
          label="Skills"
          value={form.skills}
          onChange={(e) => update('skills', e.target.value)}
          hint="Comma separated"
        />
        <TextField
          label="Closing date"
          type="date"
          value={form.closingDate}
          onChange={(e) => update('closingDate', e.target.value)}
        />
      </div>

      <div>
        <label
          htmlFor="new-job-description"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Description
        </label>
        <textarea
          id="new-job-description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={8}
          maxLength={8000}
          placeholder="What the role involves, what you are looking for, and how to succeed in it."
          className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
        />
      </div>

      <Button type="submit" isLoading={isSaving}>
        Post job
      </Button>
    </form>
  );
}
