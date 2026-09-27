import { useAuth } from '../../context/useAuth.js';

/**
 * "My CVs" dashboard.
 *
 * Phase 1 only establishes the protected route and the page frame. The CV
 * list, with strength scores and the edit, duplicate, rename and delete
 * actions, is built in Phase 2 once the CV model exists.
 */
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My CVs</h1>
        <p className="mt-1 text-sm text-slate-500">Signed in as {user.email}</p>
      </header>

      {/* Empty state. In Phase 2 this is replaced by the list of CVs. */}
      <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 bg-white p-12 text-center">
        <h2 className="font-semibold text-slate-900">No CVs yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          The CV builder arrives in the next phase. You will be able to keep several CVs here, one
          for each kind of role you apply for.
        </p>
      </div>
    </div>
  );
}
