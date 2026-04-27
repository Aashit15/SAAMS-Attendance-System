import { useState, useEffect } from 'react';
import { sessionService } from '../../services/services';
import { Link } from 'react-router-dom';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionService.getAll({ limit: 50 })
      .then(res => setSessions(res.data.data.sessions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Sessions</h1>
          <p className="text-surface-200/60 mt-1">{sessions.length} sessions</p>
        </div>
        <Link to="/faculty/create-session" className="px-5 py-2.5 gradient-primary rounded-xl text-white font-medium text-sm hover:opacity-90 transition-all shadow-lg shadow-primary-500/20">+ New Session</Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-surface-200/40">No sessions yet</div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <Link key={s._id} to={`/faculty/session/${s._id}`} className="block glass rounded-xl p-5 hover:border-primary-500/30 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-surface-100">{s.course?.name || 'Course'}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-surface-200/40">{new Date(s.date).toLocaleDateString()}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      s.attendanceMode === 'dual' ? 'bg-purple-500/15 text-purple-400' :
                      s.attendanceMode === 'qr' ? 'bg-blue-500/15 text-blue-400' :
                      'bg-emerald-500/15 text-emerald-400'
                    }`}>{s.attendanceMode}</span>
                    <span className="text-xs text-surface-200/30">{s.location}</span>
                  </div>
                </div>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${
                  s.status === 'active' ? 'bg-green-500/15 text-green-400 animate-pulse-slow' :
                  s.status === 'closed' ? 'bg-surface-700/50 text-surface-200/50' :
                  'bg-red-500/15 text-red-400'
                }`}>{s.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
