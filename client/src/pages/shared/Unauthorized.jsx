import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-400">403</h1>
        <p className="text-xl text-surface-200/60 mt-4">Access Denied</p>
        <p className="text-sm text-surface-200/40 mt-2">You don't have permission to view this page</p>
        <Link to="/" className="inline-block mt-6 px-6 py-3 gradient-primary rounded-xl text-white font-medium">Go Home</Link>
      </div>
    </div>
  );
}
