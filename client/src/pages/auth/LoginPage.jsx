import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import Alert from '../../components/ui/Alert.jsx';

/**
 * Login page.
 *
 * Validation is intentionally light here — the server is the authority on
 * whether the credentials are right, and its message is what gets shown.
 */
export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Where the user was heading before the guard redirected them here.
  const redirectTo = location.state?.from?.pathname ?? '/dashboard';

  // Someone already logged in has no business on this page.
  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  /** Keeps the form state in step with whichever input changed. */
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  /** Submits the credentials and navigates on success. */
  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Log in</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back. Enter your details to continue.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <Alert variant="error">{error}</Alert>

          <TextField
            label="Email address"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />

          <TextField
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            {isSubmitting ? 'Logging in' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Do not have an account?{' '}
          <Link to="/register" className="font-medium text-slate-900 underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
