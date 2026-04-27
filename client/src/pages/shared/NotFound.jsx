import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-bold gradient-text">404</h1>
        <p className="text-xl text-surface-200/60 mt-4">Page not found</p>
        <Link to="/" className="inline-block mt-6 px-6 py-3 gradient-primary rounded-xl text-white font-medium">Go Home</Link>
      </div>
    </div>
  );
}
