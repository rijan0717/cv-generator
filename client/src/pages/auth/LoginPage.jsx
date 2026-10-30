import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { useToast } from '../../context/useToast.js';
import Button from '../../components/ui/Button.jsx';
import TextField from '../../components/ui/TextField.jsx';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton.jsx';
import { homePathFor } from '../../utils/homePath.js';

/**
 * Login page.
 *
 * Validation is intentionally light here — the server is the authority on
 * whether the credentials are right, and its message is what gets shown,
 * as a toast: the page navigates away the moment the login succeeds, so
 * there is often no page left to draw a message on.
 */
export default function LoginPage() {
  const { user, login, loginWithGoogle, isAuthenticated, isLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Where the user was heading before the guard redirected them here.
  // Without one, each kind of account goes to its own home page.
  const redirectFor = (signedIn) => location.state?.from?.pathname ?? homePathFor(signedIn);

  // Someone already logged in has no business on this page.
  if (!isLoading && isAuthenticated) {
    return <Navigate to={redirectFor(user)} replace />;
  }

  /** Keeps the form state in step with whichever input changed. */
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  /** Submits the credentials and navigates on success. */
  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const signedIn = await login(form);
      // Said before navigating, so the greeting arrives on the page the
      // user actually lands on.
      toast.success(`Welcome back, ${signedIn.name.split(' ')[0]}.`);
      navigate(redirectFor(signedIn), { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Signs in with the token from Google. A first-time Google user has just
   * been given an account, so they go to the welcome page to choose what it
   * is for, as a new registration would.
   * @param {string} credential - The Google ID token.
   */
  async function handleGoogle(credential) {
    try {
      const { user: signedIn, isNew } = await loginWithGoogle(credential);
      toast.success(
        isNew
          ? `Account created. Welcome, ${signedIn.name.split(' ')[0]}.`
          : `Welcome back, ${signedIn.name.split(' ')[0]}.`,
      );
      navigate(isNew ? '/welcome' : redirectFor(signedIn), { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <div className="rounded-xl bg-white dark:bg-slate-900 p-8 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Log in
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Welcome back. Enter your details to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
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

        <div className="mt-6">
          <GoogleSignInButton onCredential={handleGoogle} text="signin_with" />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Do not have an account?{' '}
          <Link to="/register" className="font-medium text-slate-900 dark:text-slate-100 underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
