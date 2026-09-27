import { useState, useRef } from 'react';
import { useAuth } from '../../context/useAuth.js';
import * as authApi from '../../api/auth.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';

/**
 * Profile page: change the display name, the avatar and the password.
 *
 * Each of the three concerns is a separate form with its own message, so a
 * failure in one does not clear the others.
 */
export default function ProfilePage() {
  const { user, setUser } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account details.</p>
      </header>

      <div className="mt-8 space-y-6">
        <AvatarSection user={user} setUser={setUser} />
        <DetailsSection user={user} setUser={setUser} />
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
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="font-semibold text-slate-900">Photo</h2>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-200"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-500"
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
          <p className="mt-2 text-xs text-slate-500">JPG, PNG or WEBP. Maximum 2 MB.</p>
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
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="font-semibold text-slate-900">Your details</h2>

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
    <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="font-semibold text-slate-900">Change password</h2>

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
