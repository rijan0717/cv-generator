import { useState } from 'react';
import * as jobApi from '../../api/jobs.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';

/** The job types a posting may use. */
const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];

/** Where the work happens. */
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];

/**
 * The form for posting a new job.
 * @param {{onPosted: (job: object) => void}} props
 */
export default function JobForm({ onPosted }) {
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
