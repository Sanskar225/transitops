import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-void text-center px-6">
      <div className="font-mono text-beacon text-sm mb-3">404 / OFF ROUTE</div>
      <h1 className="font-display text-3xl font-semibold text-ink mb-2">Page not found</h1>
      <p className="text-muted mb-6">This route doesn&apos;t exist on the map.</p>
      <Link to="/" className="btn-primary">Back to base</Link>
    </div>
  );
}
