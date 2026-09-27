import { useState, useRef } from 'react';
import { useAuth } from '../../context/useAuth.js';
import { useTheme } from '../../context/useTheme.js';
import * as authApi from '../../api/auth.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';

/**
 * Settings: everything about the account itself, as opposed to the CVs.
 *
 * Each concern is a separate form with its own message, so a failure in one
 * does not clear the others, and nothing here saves automatically — changing
 * a password or a photo should be a deliberate act.
 */
export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account, security and appearance.
        </p>
      </header>

      <div className="mt-8 space-y-6">
        <AppearanceSection />
        <PhotoSection />
        <DetailsSection />
        <PasswordSection />
        <AccountSection user={user} />
      </div>
    </div>
  );
}

/** A consistent card for each settings group. */
function Card({ title, description, children }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
      <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Theme choice.
 *
 * All three states are offered here, unlike the one-click switch in the top
 * bar: this is where someone comes to say "follow my system" explicitly.
 */
function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Match my device' },
  ];

  return (
    <Card title="Appearance" description="Choose how the application looks.">
      <fieldset>
        <legend className="sr-only">Theme</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <label
              key={option.value}
              className={[
                'cursor-pointer rounded-lg px-4 py-2 text-sm font-medium ring-1 transition',
                theme === option.value
                  ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100'
                  : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600 dark:hover:bg-slate-700',
              ].join(' ')}
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={theme === option.value}
                onChange={() => setTheme(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Your CV preview always stays on white paper, because that is how it will print.
      </p>
    </Card>
  );
}

/** Profile photo upload. */
function PhotoSection() {
  const { user, setUser } = useAuth();
  const inputRef = useRef(null);
  const [status, setStatus] = useState({ error: '', success: '' });
  const [isUploading, setIsUploading] = useState(false);

  const MAX_BYTES = 2 * 1024 * 1024;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Validates in the browser for a quick message, then uploads. The server
   * checks the same rules again, which is what actually enforces them.
   * @param {Event} event - The file input change event.
   */
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
      // Reset so choosing the same file again still fires onChange.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Card title="Photo" description="Shown beside your name in the application.">
      <div className="flex flex-wrap items-center gap-5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}

        <div>
          <input
            ref={inputRef}
            id="settings-avatar"
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
    </Card>
  );
}

/** Display name. The email identifies the account and cannot be changed. */
function DetailsSection() {
  const { user, setUser } = useAuth();
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
      setStatus({ error: '', success: 'Your details have been updated' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card title="Your details">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          hint="Your email identifies your account and cannot be changed"
        />

        <Button type="submit" isLoading={isSaving}>
          {isSaving ? 'Saving' : 'Save changes'}
        </Button>
      </form>
    </Card>
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

    const { newPassword, confirmPassword, currentPassword } = form;

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setStatus({
        error: 'New password must be at least 8 characters and contain a letter and a number',
        success: '',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ error: 'The new passwords do not match', success: '' });
      return;
    }

    setIsSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setStatus({ error: '', success: 'Your password has been changed' });
    } catch (err) {
      setStatus({ error: err.message, success: '' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card
      title="Password"
      description="Your current password is required, so nobody using an unattended browser can lock you out."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
    </Card>
  );
}

/** Read-only account facts. */
function AccountSection({ user }) {
  return (
    <Card title="Account">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Role</dt>
          <dd className="mt-0.5 font-medium capitalize text-slate-900 dark:text-slate-100">
            {user.role}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Status</dt>
          <dd className="mt-0.5 font-medium capitalize text-slate-900 dark:text-slate-100">
            {user.status}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Member since</dt>
          <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
            {new Date(user.createdAt).toLocaleDateString('en-GB')}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
