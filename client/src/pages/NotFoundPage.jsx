import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';

/** Shown for any URL that does not match a route. */
export default function NotFoundPage() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Error 404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
        <p className="mt-3 text-slate-600">
          The page you were looking for does not exist or has moved.
        </p>
        <Link to="/" className="mt-8 inline-block">
          <Button>Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
