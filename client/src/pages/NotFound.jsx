import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <span className="material-symbols-outlined text-on-surface-variant mb-4" style={{ fontSize: 72 }}>
        location_off
      </span>
      <h1 className="text-headline-lg text-on-surface mb-2">Page Not Found</h1>
      <p className="text-body-lg text-on-surface-variant mb-6 text-center">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/signin"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-container text-on-primary rounded-xl font-semibold hover:bg-primary-container/90 transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          arrow_back
        </span>
        Go to Sign In
      </Link>
    </div>
  );
}