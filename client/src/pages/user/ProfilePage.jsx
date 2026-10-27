import { useState, useRef } from 'react';
import { useAuth } from '../../context/useAuth.js';
import * as authApi from '../../api/auth.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';
import OpenToWorkBadge from '../../components/talent/OpenToWorkBadge.jsx';
import { INDUSTRIES, EMPLOYMENT_TYPES } from '../../constants/industries.js';

/**
 * Profile page: change the display name, the avatar, the password, and —
 * for a job seeker — the profile employers see in the candidate directory.
 *
 * Each concern is a separate form with its own message, so a failure in
 * one does not clear the others.
 */
export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const isJobSeeker = user.accountType === 'jobseeker';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account details.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <AvatarSection user={user} setUser={setUser} />
        <DetailsSection user={user} setUser={setUser} />
        {isJobSeeker && <JobSeekerProfileSection user={user} setUser={setUser} />}
        <PasswordSection />
      </div>
    </div>
  );
}

/**
 * Avatar upload. The file is validated in the browser for a quick message,
 * and again on the server, which is what actually enforces the rules.
 */
function AvatarSection({ user, setUser }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState({ error: '', success: '' });
  const [isUploading, setIsUploading] = useState(false);

  const MAX_BYTES = 2 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus({ error: '', success: '' });

    if (!ALLOWED.includes(file.type)) {
      setStatus({ error: 'Please choose a JPG, PNG or WEBP image', success: '' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus({ error: 'The image must be smaller than 2 MB', success: '' });
      return;
    }

    setIsUploading(true);
    try {
      const updated = await authApi.uploadAvatar(file);
      setUser(updated);
      setStatus({ error: '', success: 'Your photo has been updated' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsUploading(false);
      // Reset the input so choosing the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <section className="rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Photo</h2>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-2xl font-semibold text-slate-500 dark:text-slate-400"
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}

        <div>
          <input
            ref={inputRef}
            id="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="sr-only"
          />
          <Button
            variant="secondary"
            size="sm"
            isLoading={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? 'Uploading' : 'Change photo'}
          </Button>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            JPG, PNG or WEBP. Maximum 2 MB.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Alert variant="error">{status.error}</Alert>
        <Alert variant="success">{status.success}</Alert>
      </div>
    </section>
  );
}

/** Display name. The email address is shown but cannot be changed. */
function DetailsSection({ user, setUser }) {
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState({ error: '', success: '' });
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ error: '', success: '' });

    if (name.trim().length < 2) {
      setStatus({ error: 'Name must be at least 2 characters', success: '' });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await authApi.updateProfile({ name: name.trim() });
      setUser(updated);
      setStatus({ error: '', success: 'Your profile has been updated' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Your details</h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <Alert variant="error">{status.error}</Alert>
        <Alert variant="success">{status.success}</Alert>

        <TextField
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
        />

        <TextField
          label="Email address"
          value={user.email}
          disabled
          hint="Your email address identifies your account and cannot be changed"
        />

        <Button type="submit" isLoading={isSaving}>
          {isSaving ? 'Saving' : 'Save changes'}
        </Button>
      </form>
    </section>
  );
}

/**
 * The profile employers see: position, industry, experience, where the
 * person is, what kind of work they want and whether they are looking.
 *
 * Only job seekers get this form. It is separate from the name and photo
 * because it answers a different question — those say who the account
 * belongs to, this says what the person is looking for — and because an
 * employer sees only this part.
 */
function JobSeekerProfileSection({ user, setUser }) {
  const saved = user.jobSeekerProfile ?? {};

  const [form, setForm] = useState({
    position: saved.position ?? '',
    industry: saved.industry ?? '',
    yearsExperience: String(saved.yearsExperience ?? 0),
    openToWork: saved.openToWork ?? false,
    employmentTypes: saved.employmentTypes ?? [],
    location: saved.location ?? '',
    about: saved.about ?? '',
  });
  const [status, setStatus] = useState({ error: '', success: '' });
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Adds or removes one kind of work. More than one is normal: somebody
   * may take a full-time role or a contract, and making it a single
   * choice would force them to understate what they would accept.
   * @param {string} value - The employment type key.
   */
  function toggleEmploymentType(value) {
    setForm((previous) => ({
      ...previous,
      employmentTypes: previous.employmentTypes.includes(value)
        ? previous.employmentTypes.filter((type) => type !== value)
        : [...previous.employmentTypes, value],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ error: '', success: '' });

    const years = Number(form.yearsExperience);
    if (!Number.isInteger(years) || years < 0 || years > 60) {
      setStatus({ error: 'Years of experience must be a whole number from 0 to 60', success: '' });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await authApi.updateProfile({
        jobSeekerProfile: {
          position: form.position.trim(),
          industry: form.industry,
          yearsExperience: years,
          openToWork: form.openToWork,
          employmentTypes: form.employmentTypes,
          location: form.location.trim(),
          about: form.about.trim(),
        },
      });
      setUser(updated);
      setStatus({ error: '', success: 'Your candidate profile has been updated' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Candidate profile</h2>
        {form.openToWork && <OpenToWorkBadge />}
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        This is what approved employers see when they browse candidates, along with your photo and
        the CV you have marked as primary.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <Alert variant="error">{status.error}</Alert>
        <Alert variant="success">{status.success}</Alert>

        <TextField
          label="Current or desired position"
          value={form.position}
          onChange={(event) => setForm((p) => ({ ...p, position: event.target.value }))}
          hint="For example, Junior Accountant or React Developer"
        />

        <div>
          <label
            htmlFor="profile-industry"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Industry
          </label>
          <select
            id="profile-industry"
            value={form.industry}
            onChange={(event) => setForm((p) => ({ ...p, industry: event.target.value }))}
            className="mt-1 block w-full rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-slate-300 focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          >
            <option value="">Not stated</option>
            {INDUSTRIES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Employers filter the directory by industry, so choosing one makes you easier to find.
          </p>
        </div>

        <TextField
          label="Total years of experience"
          type="number"
          min="0"
          max="60"
          value={form.yearsExperience}
          onChange={(event) => setForm((p) => ({ ...p, yearsExperience: event.target.value }))}
        />

        <TextField
          label="Location"
          value={form.location}
          onChange={(event) => setForm((p) => ({ ...p, location: event.target.value }))}
          hint="The city or area you can work in"
        />

        <fieldset>
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Kind of work you want
          </legend>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {EMPLOYMENT_TYPES.map((entry) => (
              <label
                key={entry.value}
                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={form.employmentTypes.includes(entry.value)}
                  onChange={() => toggleEmploymentType(entry.value)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600"
                />
                {entry.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="profile-about"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            About you
          </label>
          <textarea
            id="profile-about"
            value={form.about}
            onChange={(event) => setForm((p) => ({ ...p, about: event.target.value }))}
            rows={3}
            maxLength={600}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:focus:ring-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {form.about.length} of 600 characters
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <input
            type="checkbox"
            checked={form.openToWork}
            onChange={(event) => setForm((p) => ({ ...p, openToWork: event.target.checked }))}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-600"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium text-slate-900 dark:text-slate-100">I am open to work</span>
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              Shows an &ldquo;Open to work&rdquo; banner on your profile and puts you at the top of
              the employer&rsquo;s list. Turn it off at any time.
            </span>
          </span>
        </label>

        <Button type="submit" isLoading={isSaving}>
          {isSaving ? 'Saving' : 'Save candidate profile'}
        </Button>
      </form>
    </section>
  );
}

/** Password change. The current password is required. */
function PasswordSection() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [status, setStatus] = useState({ error: '', success: '' });
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ error: '', success: '' });

    if (
      form.newPassword.length < 8 ||
      !/[A-Za-z]/.test(form.newPassword) ||
      !/[0-9]/.test(form.newPassword)
    ) {
      setStatus({
        error: 'New password must be at least 8 characters and contain a letter and a number',
        success: '',
      });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setStatus({ error: 'The new passwords do not match', success: '' });
      return;
    }

    setIsSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setStatus({ error: '', success: 'Your password has been changed' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">Change password</h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <Alert variant="error">{status.error}</Alert>
        <Alert variant="success">{status.success}</Alert>

        <TextField
          label="Current password"
          type="password"
          name="currentPassword"
          value={form.currentPassword}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        <TextField
          label="New password"
          type="password"
          name="newPassword"
          value={form.newPassword}
          onChange={handleChange}
          hint="At least 8 characters, with a letter and a number"
          autoComplete="new-password"
          required
        />

        <TextField
          label="Confirm new password"
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        <Button type="submit" isLoading={isSaving}>
          {isSaving ? 'Changing' : 'Change password'}
        </Button>
      </form>
    </section>
  );
}
