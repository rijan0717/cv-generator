import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import * as authApi from '../../api/auth.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { homePathFor, needsAccountType } from '../../utils/homePath.js';

/** The two kinds of account, as the cards describe them. */
const OPTIONS = [
  {
    value: 'jobseeker',
    title: "I'm a job seeker",
    description: 'Build CVs, check their strength, match them to jobs and apply.',
    points: ['CV builder and templates', 'CV strength score and job matching', 'Apply to jobs and track applications'],
  },
  {
    value: 'employer',
    title: "I'm an employer",
    description: 'Register your company, post jobs and review the CVs people send.',
    points: ['Company profile, approved by an admin', 'Post and manage jobs', 'View submitted CVs as sent'],
  },
];

/**
 * The one step between registering and the app: job seeker or employer.
 *
 * Shown once. ProtectedRoute sends any signed-in account without a type
 * here, and once it is chosen this page sends the user straight on — the
 * server refuses to change it a second time.
 */
export default function WelcomePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [choice, setChoice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Already chosen (or an admin): nothing to do here.
  if (!needsAccountType(user)) return <Navigate to={homePathFor(user)} replace />;

  /** Saves the choice and goes to that account type's home page. */
  async function confirm() {
    setIsSaving(true);
    setError('');

    try {
      const updated = await authApi.setAccountType(choice);
      setUser(updated);
      navigate(homePathFor(updated), { replace: true });
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
        Welcome, {user.name.split(' ')[0]} ! How will you use Smart CV Generator?
      </h1>
      <p className="mt-2 text-center text-slate-600 dark:text-slate-400">
        Choose one. This sets up your account.
      </p>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      <div role="radiogroup" aria-label="Account type" className="mt-8 grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = choice === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setChoice(option.value)}
              className={[
                'rounded-xl border-2 bg-white p-6 text-left transition dark:bg-slate-900',
                selected
                  ? 'border-indigo-600 ring-2 ring-indigo-200 dark:border-indigo-400 dark:ring-indigo-900'
                  : 'border-slate-200 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500',
              ].join(' ')}
            >
              <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {option.title}
              </span>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{option.description}</p>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                {option.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Button size="lg" disabled={!choice} isLoading={isSaving} onClick={confirm}>
          Continue
        </Button>
      </div>
    </div>
  );
}
