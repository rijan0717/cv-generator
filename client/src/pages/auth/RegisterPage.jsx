import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';

/**
 * Registration page.
 *
 * The client repeats the server's password rules so the user gets immediate
 * feedback, but the server enforces them independently — client-side checks
 * are a convenience, never a security control.
 */

/**
 * Checks one form against the same rules the server applies.
 * @param {{name: string, email: string, password: string, confirmPassword: string}} form
 * @returns {Record<string, string>} Field name to error message.
 */
function validate(form) {
  const errors = {};

  if (form.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[A-Za-z]/.test(form.password)) {
    errors.password = 'Password must contain at least one letter';
  } else if (!/[0-9]/.test(form.password)) {
    errors.password = 'Password must contain at least one number';
  }

  if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));

    // Clear this field's error as soon as the user starts correcting it.
    setFieldErrors((previous) => ({ ...previous, [name]: undefined }));
  }

  /** Validates, then registers and goes straight to the dashboard. */
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          It takes a minute, and your first CV can start straight away.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Alert variant="error">{error}</Alert>

          <TextField
            label="Full name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={fieldErrors.name}
            autoComplete="name"
            required
          />

          <TextField
            label="Email address"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            error={fieldErrors.email}
            autoComplete="email"
            required
          />

          <TextField
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            hint="At least 8 characters, with a letter and a number"
            autoComplete="new-password"
            required
          />

          <TextField
            label="Confirm password"
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
            required
          />

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            {isSubmitting ? 'Creating your account' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-slate-900 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
